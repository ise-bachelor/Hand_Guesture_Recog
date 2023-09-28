import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const demosSection = document.getElementById("demos");
let gestureRecognizer;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";
const stampContinueCount = 3000;
let timerId = null;
let timeGesture = 0;
let timeAll = 0;

// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createGestureRecognizer = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate: "GPU"
    },
    runningMode: runningMode
  });
  demosSection.classList.remove("invisible");
};

createGestureRecognizer();

/********************************************************************
// Demo 2: Continuously grab image from webcam stream and detect it.
********************************************************************/

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const gestureOutput = document.getElementById("gesture_output");

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam(event) {
  if (!gestureRecognizer) {
    alert("Please wait for gestureRecognizer to load");
    return;
  }

  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = "ENABLE PREDICTIONS";

  } else {
    webcamRunning = true;
    enableWebcamButton.innerText = "DISABLE PREDICTIONS";
  }

  // getUsermedia parameters.
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
}

const Gestures = [
  "Open_Palm",
  "ILoveYou",
  "Thumb_Up",
  "Thumb_Down",
  "Victory"
]

const onlyGestures = [
  "None", 
  "Closed_Fist",
  "Pointing_Up",
];

function displayStamp(gestureName){
  let timeOfGesPerAll = 4294967295*Math.min(1, timeGesture/timeAll);
  const geuturePercent = document.getElementById("gesture_percent");
  geuturePercent.textContent = timeOfGesPerAll;
  geuturePercent.style.color = "#"+timeOfGesPerAll.toString(16);
  if(onlyGestures.includes(gestureName) && !Gestures.includes(gestureName)){
    return;
  }
  timeGesture += 0.01;
  const stampElement = document.getElementById("stamp");
  stampElement.style.width = String(calcInputDegree()*300)+"px";
  stampElement.src = "./assets/" + gestureName + ".jpg";
  if(timerId != null){
    clearTimeout(timerId);
  }
  timerId = setTimeout(hiddenStamp, stampContinueCount);
}

function hiddenStamp() {
  const stampElement = document.getElementById("stamp");
  stampElement.src = "";
  stampElement.style.width = null;
}

let lastVideoTime = -1;
let results = undefined;
async function predictWebcam() {
  timeAll += 0.01;
  const webcamElement = document.getElementById("webcam");
  // Now let's start detecting the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
  }
  let nowInMs = Date.now();
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    results = gestureRecognizer.recognizeForVideo(video, nowInMs);
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  canvasElement.style.height = videoHeight;
  webcamElement.style.height = videoHeight;
  canvasElement.style.width = videoWidth;
  webcamElement.style.width = videoWidth;
  if (results.landmarks) {
    for (const landmarks of results.landmarks) {
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 5
      });
      drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 2 });
    }
  }
  canvasCtx.restore();
  if (results.gestures.length > 0) {
    gestureOutput.style.display = "block";
    gestureOutput.style.width = videoWidth;
    const categoryName = results.gestures[0][0].categoryName;
    displayStamp(categoryName);
    const categoryScore = parseFloat(
      results.gestures[0][0].score * 100
    ).toFixed(2);
    gestureOutput.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore} %`;
  } else {
    gestureOutput.style.display = "none";
  }
  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

let beginHandPos;
let isBegining = 1;
function calcInputDegree() {
  // measure only when a camera recognizes a gesture.
  if(!isRecognizedGesture){
    return;
  }

  // Use the position "MIDDLE_FINGER_MCP" to measure how much user's hand up or down.
  if(isBegining){
    beginHandPos = results.landmarks[0][9].y;
    isBegining = 0;
  }

  // Calc delta of y-coordinate.
  // This formula's order of subtraction is reverse.
  // Because y-axis direction is upside down.
  return beginHandPos - results.landmarks[0][9].y;
}

function isRecognizedGesture(){
  if(Gestures.includes(results.gestures[0][0].categoryName)){
    return 1;
  }
  return 0;
}