const socket = io("/");
const main__chat__window = document.getElementById("main__chat_window");
const videoGrids = document.getElementById("video-grids");
const myVideo = document.createElement("video");
const chat = document.getElementById("chat");
let OtherUsername = "";
chat.hidden = true;
myVideo.muted = true;

let mediaRecorder;
let recordedChunks = [];
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const mediaRecorders = {};
const recordedChunksByUser = {};


window.onload = () => {
  $(document).ready(function () {
    $("#getCodeModal").modal("show");
  });
};

var peer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "3030",
});

const recognition =
  "SpeechRecognition" in window
    ? new SpeechRecognition()
    : "webkitSpeechRecognition" in window
    ? new webkitSpeechRecognition()
    : null;

let myVideoStream;
const peers = {};
var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

sendmessage = (text) => {
  if (event.key === "Enter" && text.value != "") {
    socket.emit("messagesend", myname + " : " + text.value);
    text.value = "";
    main__chat_window.scrollTop = main__chat_window.scrollHeight;
  }
};

navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream, myname);
    createRecognition();
    // 오디오 추출
    const audioTracks = stream.getAudioTracks();
    const audioStream = new MediaStream(audioTracks);

    // MediaRecorder 생성 (오디오 스트림 이용)
    mediaRecorder = new MediaRecorder(audioStream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        if (!recordedChunksByUser[myname]) {
          recordedChunksByUser[myname] = [];
        }
        recordedChunksByUser[myname].push(event.data);
      }
    };
    mediaRecorder.start(100); // ms 단위로 크기 설정


    

    socket.on("user-connected", (id, username, name) => {
      connectToNewUser(id, stream, username);
      socket.emit("tellName", myname, name);
      if (recognition) {
        recognition.stop();
        recognition.start();
      }
      socket.on("receive-captions", ({ captions, username }) => {
        addCaption(captions, username);
      });
      
    });

    socket.on("user-disconnected", (id) => {
      if (peers[id]) peers[id].close();
    });
  });

peer.on("call", (call) => {
  getUserMedia(
    { video: true, audio: true },
    function (stream) {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", function (remoteStream) {
        addVideoStream(video, remoteStream, OtherUsername);
      });
    },
    function (err) {
      console.log("Failed to get local stream", err);
    }
  );
});

peer.on("open", (id) => {
  socket.emit("join-room", roomId, id, myname);
});

socket.on("createMessage", (message) => {
  var ul = document.getElementById("messageadd");
  var li = document.createElement("li");
  li.className = "message";
  li.appendChild(document.createTextNode(message));
  ul.appendChild(li);
});

socket.on("AddName", (username) => {
  OtherUsername = username;
  console.log(username);
});

const RemoveUnusedDivs = () => {
  alldivs = videoGrids.getElementsByTagName("div");
  for (var i = 0; i < alldivs.length; i++) {
    e = alldivs[i].getElementsByTagName("video").length;
    if (e == 0) {
      alldivs[i].remove();
    }
  }
};

const connectToNewUser = (userId, streams, myname) => {
  const call = peer.call(userId, streams);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, myname);
    
  });
  call.on("close", () => {
    video.remove();
    RemoveUnusedDivs();
  });
  peers[userId] = call;

  const audioTracks = streams.getAudioTracks();
  const audioStream = new MediaStream(audioTracks);
  const userMediaRecorder = new MediaRecorder(audioStream);

  userMediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      if (!recordedChunksByUser[myname]) {
        recordedChunksByUser[myname] = [];
      }
      recordedChunksByUser[myname].push(event.data);
    }
  };
  userMediaRecorder.start(100);
  mediaRecorders[myname] = userMediaRecorder;



};

const cancel = () => {
  $("#getCodeModal").modal("hide");
};

const copy = async () => {
  const roomid = document.getElementById("roomid").innerText;
  await navigator.clipboard.writeText(
    "http://localhost:3030/join/" + roomid
  );
};
const invitebox = () => {
  $("#getCodeModal").modal("show");
};

const muteUnmute = () => {
  const audioTrack = myVideoStream.getAudioTracks()[0];
  const mic = document.getElementById("mic");

  audioTrack.enabled = !audioTrack.enabled;

  if (!audioTrack.enabled) {
    mic.style.color = "red";
  } else {
    mic.style.color = "white";
  }
};

const VideomuteUnmute = () => {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    document.getElementById("video").style.color = "red";
  } else {
    document.getElementById("video").style.color = "white";
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
};

const showchat = () => {
  if (chat.hidden == false) {
    chat.hidden = true;
  } else {
    chat.hidden = false;
  }
};

const addVideoStream = (videoEl, stream, name) => {
  videoEl.srcObject = stream;
  videoEl.addEventListener("loadedmetadata", () => {
    videoEl.play();
  });
  const h1 = document.createElement("h1");
  const h1name = document.createTextNode(name);
  h1.appendChild(h1name);
  const videoGrid = document.createElement("div");
  videoGrid.classList.add("video-grid");
  videoGrid.id = "video-grid-" + name; // 사용자 이름에 따라 고유한 ID 추가
  videoGrid.appendChild(h1);
  videoGrids.appendChild(videoGrid);
  videoGrid.append(videoEl);
  
  // Download button 추가
  const downloadButton = document.createElement("button");
  downloadButton.classList.add("download-button");
  downloadButton.innerText = "Download";
  downloadButton.addEventListener("click", () => downloadWAV(name));
  videoGrid.appendChild(downloadButton);
  
  RemoveUnusedDivs();
  let totalUsers = document.getElementsByTagName("video").length;
  if (totalUsers > 1) {
    for (let index = 0; index < totalUsers; index++) {
      document.getElementsByTagName("video")[index].style.width =
        100 / totalUsers + "%";
    }
  }
};

const addCaption = (text, name) => {
  const videoContainer = document.getElementById("video-grid-" + name);

  const existingCaption = videoContainer.getElementsByClassName("caption")[0];
  if (existingCaption) {
    videoContainer.removeChild(existingCaption);
  }

  const captionDiv = document.createElement("div");
  captionDiv.classList.add("caption");
  captionDiv.dataset.username = name;

  const h2 = document.createElement("h2");
  h2.style.color = "black";
  const h2name = document.createTextNode(name + ":");
  h2.appendChild(h2name);

  const captionText = document.createTextNode(text);
  captionDiv.appendChild(h2);
  captionDiv.appendChild(captionText);

  videoContainer.appendChild(captionDiv);
  setTimeout(() => {
    if (videoContainer.contains(captionDiv)) {
      videoContainer.removeChild(captionDiv);
    }
  }, 3000);
};


const downloadWAV = (userId) => {
  // 사용자별로 녹음된 chunk에서 Blob 생성
  const userRecordedChunks = recordedChunksByUser[userId];
  if (!userRecordedChunks || userRecordedChunks.length === 0) {
    console.log("No recorded audio for user:", userId);
    return;
  }

  const blob = new Blob(userRecordedChunks, {
    type: "audio/wav",
  });

  // Blob을 다운로드할 수 있는 URL 생성
  const url = URL.createObjectURL(blob);

  // a 태그를 사용하여 다운로드
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = `captions_${userId}_${Date.now()}.wav`;
  document.body.appendChild(a);
  a.click();

  // 메모리 누수 방지를 위해 URL에서 Blob을 해제하고 a 태그 제거
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};




function createRecognition() {
  const recognition =
    "SpeechRecognition" in window
      ? new SpeechRecognition()
      : "webkitSpeechRecognition" in window
      ? new webkitSpeechRecognition()
      : null;

  if (!recognition) {
    console.error("Web Speech API를 사용할 수 없습니다.");
    return null;
  }

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "ko-KR";


  if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ko-KR";
    recognition.start();
    

    recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      addCaption(text, myname);
      socket.emit("captions", { text, username: myname });
    };

    socket.on("receive-captions", ({ captions, username }) => {
      addCaption(captions, username);
    });

    recognition.onend = () => {
      recognition.start();
    };

    recognition.onerror = (event) => {
      console.error("Error occurred in recognition:", event.error);
      recognition.start();
    };
  }

}