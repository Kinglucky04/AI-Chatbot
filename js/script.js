const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"  // Local development
    : window.location.origin;   // Production (same domain)

const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessage = document.getElementById("send-message");
const fileInput = document.getElementById("file-input");
const attachBtn = document.getElementById("attach_file");
const voiceBtn = document.getElementById("voice-msg");
const userData = {
    message: null
}

let recorder;
let audioChunks = [];

// ensure that enter key sends the message
messageInput.addEventListener("keypress", (e) => {
    const userMessage = messageInput.value.trim();
    if(e.key === "Enter" && userMessage){
        handleOutGoingMessage(e);
    }
});

sendMessage.addEventListener("click", (e) => {
    handleOutGoingMessage(e);
});

attachBtn.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if(!file) return;

    // preview message
    const messageContent = `<div class="message-text">Uploading ${file.name}...</div>`;
    const msg = createMessageElement(messageContent, "user-message");
    chatBody.appendChild(msg);

    // convert file to base64
    const reader = new FileReader();
    reader.onload = async () => {
        const base64 = reader.result.split(",")[1];

        await sendFileToAI(base64, file.type);
    };
    reader.readAsDataURL(file);
});

/* voiceBtn.addEventListener("click", async () => {

    if(recorder && recorder.state === "recording"){
        recorder.stop();
        voiceBtn.textContent = "settings_voice";
        return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio:true });

    recorder = new MediaRecorder(stream);
    audioChunks = [];

    recorder.ondataavailable = e => audioChunks.push(e.data);

    recorder.onstop = async () => {

        const blob = new Blob(audioChunks,{ type:"audio/webm" });

        const reader = new FileReader();
        reader.onload = async ()=>{
            const base64 = reader.result.split(",")[1];
            await sendAudioToAI(base64);
        };
        reader.readAsDataURL(blob);
    };

    recorder.start();
    voiceBtn.textContent = "stop_circle";
}); */

// create message with dynamic classes and return it
function createMessageElement(content, ...classes){
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

// Sends user message to backend and updates the chat with the bot response
async function generateBotResponse(incomingMessage) {
    const textElement = incomingMessage.querySelector(".message-text");

    try {
        const res = await fetch(`${API_BASE_URL}/api/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: userData.message })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.details || errorData.error || `Server error: ${res.status}`);
        }

        const data = await res.json();

        textElement.classList.remove("thinking-dots");
        textElement.textContent = data.reply;

    } catch (error) {
        textElement.classList.remove("thinking-dots");
        textElement.textContent = "Error: " + error.message;
        console.error("Chatbot error:", error);
    }
}


// send file data to AI and get response
async function sendFileToAI(base64, mimeType) {
    // Show thinking animation in the chat
    const thinkingMsg = createMessageElement(
        `<div class="message-text thinking-dots"><span></span><span></span><span></span></div>`,
        "bot-message"
    );
    chatBody.appendChild(thinkingMsg);

    const textElement = thinkingMsg.querySelector(".message-text");

    try {
        // Send file to backend
            const res = await fetch(`${API_BASE_URL}/api/file`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Describe this file",
                file: {
                    data: base64,
                    type: mimeType
                }
    })
});

        const data = await res.json();

        // Remove thinking animation and display bot response
        textElement.classList.remove("thinking-dots");
        textElement.textContent = data.reply;

    } catch (err) {
        textElement.classList.remove("thinking-dots");
        textElement.textContent = "Upload failed.";
        console.error("File upload error:", err);
    }
}


// this feature is currently not working because openrouter does not support audio input yet. still looking for a model that supports audio, will implement it when i do.
/* async function sendAudioToAI(base64){

    const thinkingMsg = createMessageElement(
        `<div class="message-text thinking-dots"><span></span><span></span><span></span></div>`,
        "bot-message"
    );
    chatBody.appendChild(thinkingMsg);

    const textElement = thinkingMsg.querySelector(".message-text");

    try{
        const res = await fetch(API_URL,{
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                "Authorization":`Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model:"openai/gpt-4o",
                messages:[
                    {
                        role:"user",
                        content:[
                            { type:"text", text:"Transcribe this audio" },
                            {
                                type:"input_audio",
                                input_audio:{
                                    data: base64,
                                    format:"webm"
                                }
                            }
                        ]
                    }
                ]
            })
        });

        const data = await res.json();
        console.log(data);
        textElement.classList.remove("thinking-dots");
        textElement.textContent = data.choices[0].message.content;

    }catch(err){
        textElement.textContent="Voice failed.";
        console.error(err);
    }
} */

// handle outgoing message by the user
function handleOutGoingMessage(e){
    e.preventDefault();
    userData.message = messageInput.value.trim();
    messageInput.value = "";

    // create and display user messages
    const messageContent = `<div class="message-text"></div>`;
    const outgoingMessage =  createMessageElement(messageContent, "user-message");
    outgoingMessage.querySelector(".message-text").textContent = userData.message;
    chatBody.appendChild(outgoingMessage);

    setTimeout(() => {
        const messageContent = ` <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="currentColor" fill="none">
                    <defs />
                    <path fill="currentColor" d="M11.25,5.621 C10.377,5.312 9.75,4.477 9.75,3.5 C9.75,2.26 10.76,1.25 12,1.25 C13.24,1.25 14.25,2.26 14.25,3.5 C14.25,4.477 13.623,5.312 12.75,5.621 L12.75,7.25 L13,7.25 C16.03,7.25 17.55,7.25 18.65,8.35 C19.251,8.951 19.524,9.708 19.648,10.75 C20.586,10.751 21.125,10.765 21.62,11.05 C21.96,11.25 22.25,11.53 22.45,11.88 C22.75,12.4 22.75,12.97 22.75,14 C22.75,15.03 22.75,15.6 22.45,16.12 C22.26,16.46 21.97,16.75 21.62,16.95 C21.125,17.235 20.586,17.249 19.648,17.25 C19.524,18.292 19.251,19.049 18.65,19.65 C17.55,20.75 16.03,20.75 13,20.75 L12.48,20.75 C12.04,21.51 10.87,22.75 8,22.75 C7.7,22.75 7.42,22.57 7.31,22.29 C7.2,22.01 7.26,21.69 7.47,21.47 C7.59,21.35 7.85,21.03 8.04,20.68 C6.87,20.58 6.02,20.32 5.35,19.65 C4.748,19.048 4.475,18.293 4.352,17.25 C3.414,17.249 2.875,17.235 2.38,16.95 C2.04,16.75 1.75,16.47 1.55,16.12 C1.25,15.6 1.25,15.03 1.25,14 C1.25,12.97 1.25,12.4 1.55,11.88 C1.74,11.54 2.03,11.25 2.38,11.05 C2.875,10.765 3.414,10.751 4.352,10.75 C4.475,9.707 4.748,8.952 5.35,8.35 C6.45,7.25 7.97,7.25 11,7.25 L11.25,7.25 Z M11.879,8.74 L11.01,8.74 L11,8.75 L11,8.75 C8.38,8.75 7.07,8.75 6.41,9.41 C5.75,10.07 5.75,11.38 5.75,14 C5.75,16.62 5.75,17.93 6.41,18.59 C6.84,19.02 7.52,19.19 9.02,19.23 C9.43,19.24 9.75,19.57 9.75,19.98 C9.75,20.39 9.65,20.74 9.51,21.08 C10.946,20.726 11.246,19.904 11.277,19.817 L11.28,19.81 C11.36,19.48 11.66,19.24 12.01,19.24 L13.01,19.24 C15.63,19.24 16.94,19.24 17.6,18.58 C18.26,17.92 18.26,16.61 18.26,13.99 C18.26,11.37 18.26,10.06 17.6,9.4 C16.94,8.74 15.63,8.74 13.01,8.74 L12.121,8.74 C12.082,8.747 12.041,8.75 12,8.75 C11.959,8.75 11.918,8.747 11.879,8.74 Z M9.55,17.102 C9.22,16.852 9.15,16.382 9.4,16.052 C9.64,15.722 10.11,15.652 10.44,15.892 C10.48,15.922 10.99,16.252 12,16.252 C13.01,16.252 13.54,15.912 13.56,15.892 C13.9,15.662 14.36,15.732 14.6,16.072 C14.84,16.402 14.77,16.862 14.44,17.102 C14.35,17.172 13.534,17.75 12,17.752 L11.995,17.752 L11.99,17.752 C10.457,17.75 9.64,17.172 9.55,17.102 Z M19.75,14 L19.75,14 C19.75,14.644 19.75,15.224 19.738,15.75 C20.326,15.749 20.721,15.738 20.88,15.65 C21,15.58 21.09,15.49 21.15,15.38 C21.25,15.2 21.25,14.72 21.25,14 L21.25,14 C21.25,13.28 21.25,12.8 21.15,12.62 C21.09,12.51 20.99,12.41 20.88,12.35 C20.721,12.262 20.326,12.251 19.738,12.25 C19.75,12.776 19.75,13.356 19.75,14 Z M4.262,12.25 C3.674,12.251 3.279,12.262 3.12,12.35 C3,12.42 2.91,12.51 2.85,12.62 C2.75,12.8 2.75,13.28 2.75,14 L2.75,14 C2.75,14.72 2.75,15.2 2.85,15.38 C2.91,15.49 3.01,15.59 3.12,15.65 C3.279,15.738 3.674,15.749 4.262,15.75 C4.25,15.225 4.25,14.644 4.25,14 L4.25,14 C4.25,13.356 4.25,12.775 4.262,12.25 Z M9,13.75 C8.59,13.75 8.25,13.41 8.25,13 L8.25,12 C8.25,11.59 8.59,11.25 9,11.25 C9.41,11.25 9.75,11.59 9.75,12 L9.75,13 C9.75,13.41 9.41,13.75 9,13.75 Z M15,13.75 C14.59,13.75 14.25,13.41 14.25,13 L14.25,12 C14.25,11.59 14.59,11.25 15,11.25 C15.41,11.25 15.75,11.59 15.75,12 L15.75,13 C15.75,13.41 15.41,13.75 15,13.75 Z M12,4.25 C12.41,4.25 12.75,3.91 12.75,3.5 C12.75,3.09 12.41,2.75 12,2.75 C11.59,2.75 11.25,3.09 11.25,3.5 C11.25,3.91 11.59,4.25 12,4.25 Z" />
                </svg>
                <div class="message-text thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>`;
        const incomingMessage =  createMessageElement(messageContent, "bot-message");
        // incomingMessage.querySelector(".message-text").textContent = userData.message;
        chatBody.appendChild(incomingMessage);

        generateBotResponse(incomingMessage);
    }, 600); 
} 