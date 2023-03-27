const socket = io();

//1. 스트림을 받아야함. getMedia()
//2. myFace(비디오태그).srcObject = myStrea을 통해 내 얼굴 넣기
//3. 버튼 만들기
//4. 비디오는 track이라는걸 제공해 주기 때문에 접근하고 다룰 수 있다.
//myStream.getAudioTracks().enabled, myStream.getVideoTracks().enabled
//5. 유저가 가지고 있는 카메라들의 목록 만들기
//navigator.mediaDevices.enumerateDevices()는 모든 장비들을 알려준다.
//devices를 얻고, 거기서 cameras를 얻을 수 있다.
//카메라를 선택하기 위해선 label과 deviceID가 필요하다.
//6. cameraOptions.addEventListener("input");
//7. 카메라가 바뀌면 getMedia를 다시 실행해 주면 됨.
//initialConstraint, cameraConstraint 설정
//8. peer A to peer B get UserMedia를 한거임
//9. addStream()을 해야하는데 그 전에 rtc연결을 해야함.
//양쪽 모두 돌아가는 부분은 startMedia 부분
//makeConnection() 함수 즉, 실제로 연결을 만드는 함수를 만들어주자.
//단계설명
//1. peerConnection 을 양측 브라우저에 만든다.
//2. addStream이라는 함수를 사용한다(구버전임.)
//영상의 데이터들을 peerConnection에 집어넣아야함.
//peerConnection.addTrack을 통해 넣을 수 있음.
//peer A는 알림을 받는 사람임. -> offer를 만드는 주체가 됨.
//3. offer를 만들었다면 다음음 setLocalDescription().
//만들었던 offer로 연결을 구성해햠. myPeerConnection.setLocalDescription(offer);
//4. peer B에서 setRemoteDescription() 을 만들어야함.
//peer B가 받는 offer는 remote Descriptiond임.
//그래서 그걸 setRemoteDescription(offer)하면 set이 됨!
//*offer들이 매우 빠르게 전달되기 때문에 myPeerConnection이 존재하기도 전에 전달되어 문제가 생긴다.
//5. peer B에서 createAnswer를 하면 됨.
//6. 똑같이 setLocalDescription(answer) 하고 socket을 이용해 보내주면 됨.
//7. 역시 peer A에서 받은걸로 setRemoteDescription()해버리면 끝!
//8. 이제 iceCandidate를 하면 됨.
//이는 서로간의 인터넷 연결을 제공하는 프로토콜임.
//peerConnection이 만들어지면 바로 addEventListener를 통해 귀를 열어두기
//peerConnection.addEventListener("icecandidate", handleIce);
//handleIce는 data로 Ice의 정보들을 가지고 있음.
//9. 이 icecandidate들을 다시 다른 브라우저로 보내야함.
//늘 하던데로 emit, on 을 이용해 모든 브라우저에게 전파
//10. myPeerConnection.addIceCandidate(ice);
//이제 서로의 icecandidate 교환이 자동으로 일어남.
//11. addStreamEvent마지막으로 등록
//각각 서로의 브라우저 스트림을 가져온거임!!!!!!!!

//DATA CHANNEL
//1. 무언가를 offer하는 socket => Data channel을 생성하는 주체

//---------STREAM------------
const myFace = document.querySelector("#myFace");
const audioBtn = document.querySelector("#audio");
const cameraBtn = document.querySelector("#camera");

const cameraOptions = document.querySelector("#cameras");

let myStream;
let audio = true;
let camera = true;

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log(devices);
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceID;
      option.innerText = camera.label;
      if (currentCamera.label == camera.label) {
        option.selected = true;
      }
      cameraOptions.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

//비디오 스트림
async function getMedia(deviceID) {
  //without deviceID
  const initialConstraint = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstraint = {
    audio: true,
    video: { deviceID: { exact: deviceID } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceID ? cameraConstraint : initialConstraint
    );
    myFace.srcObject = myStream;
    if (!deviceID) {
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
}

getMedia();

//버튼 리스너
function handleAudioClick() {
  myStream.getAudioTracks().forEach((track) => {
    return (track.enabled = !track.enabled);
  });
  if (audio === true) {
    audio = false;
    audioBtn.innerHTML = "Audio Off";
  } else {
    audio = true;
    audioBtn.innerHTML = "Audio On";
  }
}

function handleCameraClick() {
  myStream.getVideoTracks().forEach((track) => {
    return (track.enabled = !track.enabled);
  });
  if (camera === true) {
    camera = false;
    cameraBtn.innerHTML = "Camera Off";
  } else {
    camera = true;
    cameraBtn.innerHTML = "Camera On";
  }
}

async function changeCameraOption() {
  await getMedia(cameraOptions.value);
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    console.log(videoSender);
    videoSender.replaceTrack(videoTrack);
  }
}

audioBtn.addEventListener("click", handleAudioClick);
cameraBtn.addEventListener("click", handleCameraClick);
cameraOptions.addEventListener("input", changeCameraOption);
//---------/STREAM-----------

//---------WELCOME-----------
const welcome = document.querySelector("#welcome");
const call = document.querySelector("#call");

let roomName;
let myPeerConnection;
let myDataChannel;

call.style.display = "none";

async function initCall() {
  welcome.style.display = "none";
  call.style.display = "block";
  await getMedia();
  makeConnection();
}

async function handleWelcome(event) {
  event.preventDefault();
  const welcomeInput = welcome.querySelector("input");
  roomName = welcomeInput.value;
  await initCall();
  socket.emit("join_room", roomName);
  welcomeInput.value = "";
}

function makeConnection() {
  myPeerConnection = new RTCPeerConnection();
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
  const peerFace = document.getElementById("peerFace");
  console.log("got an event from my peer");
  peerFace.srcObject = data.stream;
}

//이 코드는 only peer A 브라우저에서만 실행 됨.
//이놈이 data channel 주체
const chatUl = document.querySelector("#chat ul");
socket.on("welcome", async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => {
    const li = document.createElement("li");
    li.innerHTML = `상대 - ${event.data}`;
    chatUl.appendChild(li);
  });
  console.log("made data channel");
  console.log("someone joined");
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
});

//여기는 peer B에서 실행됨.
socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) => {
      const li = document.createElement("li");
      li.innerHTML = `상대 - ${event.data}`;
      chatUl.appendChild(li);
    });
  });
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => {
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});

welcome.addEventListener("submit", handleWelcome);
//---------/WELCOME----------

//--------CHAT------
const chatRoom = document.querySelector("#chatRoom");
const chatForm = chatRoom.querySelector("form");

function handleChatSubmit(event) {
  event.preventDefault();
  const input = chatForm.querySelector("input");
  console.log(input.value);

  myDataChannel.send(input.value);

  const li = document.createElement("li");
  li.innerHTML = `나 - ${input.value}`;
  chatUl.appendChild(li);

  input.value = "";
}

chatForm.addEventListener("submit", handleChatSubmit);
