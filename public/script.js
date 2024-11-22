
const socket = io('https://testwebrtc3-20d5423d25c9.herokuapp.com/');

let localStream;
let pc;
const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const restartIceButton = document.getElementById('restartIceButton');

startButton.onclick = start;
restartIceButton.onclick = restartIce;

async function start() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    createPeerConnection();

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    const offer = await pc.createOffer();
    console.log('start => offer', offer);
    console.log('start => pc.setLocalDescription(offer)');
    await pc.setLocalDescription(offer);

    console.log("start => pc", pc);
    console.log("start => pc.localDescription", pc.localDescription);
    console.log("start => socket.emit('signal', { description: pc.localDescription }");
    socket.emit('signal', { description: pc.localDescription });
}

function createPeerConnection() {
    pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = ({ candidate }) => {
        console.log('createPeerConnection => onicecandidate => candidate', candidate);
        console.log("createPeerConnection => onicecandidate => socket.emit('signal', { candidate })");
        socket.emit('signal', { candidate });
    };

    pc.ontrack = (event) => {
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            console.log('Получен удаленный поток');
        }
    };

    pc.onconnectionstatechange = () => {
        console.log('Изменение состояния соединения: ', pc.connectionState);

        const state = pc.connectionState;
        if (state === 'disconnected' || state === 'failed') {
            restartIce()
        }
    };
}

socket.on('signal', async (data) => {
    console.log('on("signal") => data', data);

    if (data.description) {
        console.log('on("signal") => data.description', data.description);
        const remoteDesc = new RTCSessionDescription(data.description);
        console.log('on("signal") => remoteDesc', remoteDesc);

        console.log('on("signal") => pc.setRemoteDescription(remoteDesc)');
        await pc.setRemoteDescription(remoteDesc);

        if (remoteDesc.type === 'offer') {
            const answer = await pc.createAnswer();
            console.log('on("signal") => answer', answer);

            console.log('on("signal") => pc.setLocalDescription(answer)');
            await pc.setLocalDescription(answer);

            console.log('on("signal") => "signal", pc', pc);
            console.log('on("signal") => "signal", pc.localDescription', pc.localDescription);
            console.log('on("signal") => "signal", { description: pc.localDescription }');
            socket.emit('signal', { description: pc.localDescription });
        }
    } else if (data.candidate) {
        console.log('on("signal") => data.candidate', data.candidate);
        try {
            console.log('pc.addIceCandidate(data.candidate)');
            await pc.addIceCandidate(data.candidate);
        } catch (e) {
            console.error('Ошибка при добавлении ICE-кандидата', e);
        }
    }
});

async function restartIce() {
    console.log('Перезапуск ICE');
    const offer = await pc.createOffer({ iceRestart: true });

    console.log('restartIce => offer', offer);
    console.log('restartIce => pc.setLocalDescription(offer)');

    await pc.setLocalDescription(offer);

    console.log('restartIce => pc', pc);
    console.log('restartIce => pc.localDescription', pc.localDescription);
    console.log("restartIce => socket.emit('signal', { description: pc.localDescription })");

    socket.emit('signal', { description: pc.localDescription });
}
