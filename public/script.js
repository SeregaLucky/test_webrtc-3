
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
    await pc.setLocalDescription(offer);

    socket.emit('signal', { description: pc.localDescription });
}

function createPeerConnection() {
    pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = ({ candidate }) => {
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
    };
}

socket.on('signal', async (data) => {
    if (data.description) {
        const remoteDesc = new RTCSessionDescription(data.description);
        await pc.setRemoteDescription(remoteDesc);

        if (remoteDesc.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('signal', { description: pc.localDescription });
        }
    } else if (data.candidate) {
        try {
            await pc.addIceCandidate(data.candidate);
        } catch (e) {
            console.error('Ошибка при добавлении ICE-кандидата', e);
        }
    }
});

async function restartIce() {
    console.log('Перезапуск ICE');
    const offer = await pc.createOffer({ iceRestart: true });
    await pc.setLocalDescription(offer);
    socket.emit('signal', { description: pc.localDescription });
}
