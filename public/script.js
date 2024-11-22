
// const socket = io('http://localhost:3003');
const socket = io('https://fierce-tundra-83230-a449f2e56dd2.herokuapp.com/');

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
    console.log('start =>  offer', offer);
    console.log('start =>  pc.setLocalDescription(offer)');
    await pc.setLocalDescription(offer);

    socket.emit('signal', { description: pc.localDescription });
}

function createPeerConnection() {
    pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (data) => {
        console.log('onicecandidate =>  data', data);
        console.log('onicecandidate =>  data.candidate', data.candidate);
        
        socket.emit('signal', { candidate: data.candidate });
    };

    pc.ontrack = (event) => {
        console.log('ontrack =>  event', event);

        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            console.log('ontrack =>  Получен удаленный поток');
        }
    };

    pc.onconnectionstatechange = () => {
        console.log('state => Изменение состояния соединения: ', pc.connectionState);
    };
}

socket.on('signal', async (data) => {
    console.log("socket.on('signal'  =>   data", data);

    if (data.description) {
        console.log("pc.addIceCandidate(data.candidate)", data.description);
        const remoteDesc = new RTCSessionDescription(data.description);
        await pc.setRemoteDescription(remoteDesc);

        if (remoteDesc.type === 'offer') {
            const answer = await pc.createAnswer();
            console.log("answer", answer);
            await pc.setLocalDescription(answer);
            socket.emit('signal', { description: pc.localDescription });
        }
    } else if (data.candidate) {
        try {
            console.log("pc.addIceCandidate(data.candidate)", candidate);
            await pc.addIceCandidate(data.candidate);
        } catch (e) {
            console.error('Ошибка при добавлении ICE-кандидата', e);
        }
    }
});

async function restartIce() {
    console.log('=============');

    console.log('Перезапуск ICE');
    const offer = await pc.createOffer({ iceRestart: true });
    console.log('restartIce =>  offer', offer);

    await pc.setLocalDescription(offer);

    // console.log('restartIce =>  offer', offer);
    console.log('restartIce =>  pc', pc);
    console.log('restartIce =>  pc.localDescription', pc.localDescription);
    console.log('=============');

    socket.emit('signal', { description: pc.localDescription });
}

