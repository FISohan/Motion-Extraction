let gl;
let programInfo;
let buffers;
let textures = [];
let realtimeTexture;
let video;
let videoBuffer = [];
let lastVideoTime = -1;
let frameCount = 0;
let canvasIndex = 0;
const MAX_FRAMES = 4;
const DELAYED = 50;
const frameCanvases = [];



async function loadAndCompileShader(shaderFileName) {
    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec2 aTextureCoord;
        varying highp vec2 vTextureCoord;
        void main(void) {
            gl_Position = aVertexPosition;
            vTextureCoord = aTextureCoord;
        }
    `;

    const fsSource = await fetch(shaderFileName).then(res => res.text());

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (!shaderProgram) {
        return null;
    }

    programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
        },
        uniformLocations: {
            uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
            uSampler1: gl.getUniformLocation(shaderProgram, 'uSampler1'),
            uSampler2: gl.getUniformLocation(shaderProgram, 'uSampler2'),
            uSampler3: gl.getUniformLocation(shaderProgram, 'uSampler3'),
            uSamplerRealtime: gl.getUniformLocation(shaderProgram, 'uSamplerRealtime'),
            resolution: gl.getUniformLocation(shaderProgram, 'u_resolution'),
        },
    };
    return programInfo;
}

async function main() {
    const canvas = document.getElementById('glCanvas');
    gl = canvas.getContext('webgl');
    if (!gl) {

        return;
    }

    video = document.getElementById('webcam');
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: 'environment',
            width: { ideal: 1920 }, // Request Full HD width
            height: { ideal: 1080 }, // Request Full HD height
            frameRate: { ideal: 30 } // Request 30 frames per second
        }
    });
    video.srcObject = stream;
    await video.play();

    const videoAspectRatio = video.videoWidth / video.videoHeight;

    function resizeCanvas() {
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;

        let newCanvasWidth = displayWidth;
        let newCanvasHeight = displayWidth / videoAspectRatio;

        if (newCanvasHeight > displayHeight) {
            newCanvasHeight = displayHeight;
            newCanvasWidth = displayHeight * videoAspectRatio;
        }

        canvas.width = newCanvasWidth;
        canvas.height = newCanvasHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Initial resize

    // Initialize textures and frame canvases once
    for (let i = 0; i < MAX_FRAMES; i++) {
        textures.push(initTexture(gl));
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        frameCanvases.push(canvas);
    }
    realtimeTexture = initTexture(gl);

    buffers = initBuffers(gl);

    // Shader selection logic
    const shaderSelector = document.getElementById('shader-selector');
    const shaderFiles = ['shader.frag', 'shader2.frag', 'shader3.frag']; // Hardcoded list of shader files

    shaderFiles.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        shaderSelector.appendChild(option);
    });

    shaderSelector.addEventListener('change', async (event) => {
        const selectedShader = event.target.value;

        const newProgramInfo = await loadAndCompileShader(selectedShader);
        if (newProgramInfo) {
            programInfo = newProgramInfo;
        }
    });

    // Load initial shader
    const initialShader = shaderFiles[0];
    if (initialShader) {
    
        const initialProgramInfo = await loadAndCompileShader(initialShader);
        if (initialProgramInfo) {
            programInfo = initialProgramInfo;
        } else {
    
            return;
        }
    } else {

        return;
    }

    setInterval(() => {
        updateVideoBuffer(video);
    }, DELAYED);

    function render() {
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, realtimeTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

        const firstFrame = videoBuffer[0];
        const lastFrame = videoBuffer[videoBuffer.length - 1];
        const offset = (lastFrame && firstFrame) ? lastFrame.frame - firstFrame.frame : 'N/A';


        if (videoBuffer.length >= MAX_FRAMES - 1) {
            updateTexture(gl, textures, videoBuffer);
            drawScene(gl, programInfo, buffers, textures, realtimeTexture);
        }
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function updateVideoBuffer(vid) {
    if (vid.currentTime === lastVideoTime) {
        return; // No new frame yet
    }
    lastVideoTime = vid.currentTime;
    frameCount++; // Increment frame counter

    const canvas = frameCanvases[canvasIndex];
    const ctx = canvas.getContext('2d');
    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);

    videoBuffer.push({ frame: frameCount, video: canvas });

    if (videoBuffer.length > MAX_FRAMES) videoBuffer.shift();

    canvasIndex = (canvasIndex + 1) % MAX_FRAMES;
}

function initBuffers(gl) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1.0, 1.0,
        1.0, 1.0,
        -1.0, -1.0,
        1.0, -1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    const textureCoordinates = [
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        textureCoord: textureCoordBuffer,
    };
}

function initTexture(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        width, height, border, srcFormat, srcType,
        pixel);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    return texture;
}

function updateTexture(gl, textures, frames) {
    for (let i = 0; i < frames.length; i++) {
        const frameData = frames[i];
        const vid = frameData.video;
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, textures[i]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);

    }
    // logToUI(frames.length);
}
function drawScene(gl, programInfo, buffers, textures, realtimeTexture) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(programInfo.program);

    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
        gl.vertexAttribPointer(
            programInfo.attribLocations.textureCoord,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
    }

    for (let i = 0; i < textures.length; i++) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, textures[i]);
        gl.uniform1i(programInfo.uniformLocations[`uSampler${i === 0 ? '' : i}`], i);
    }

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, realtimeTexture);
    gl.uniform1i(programInfo.uniformLocations.uSamplerRealtime, 4);

    gl.uniform2f(programInfo.uniformLocations.resolution, gl.canvas.width, gl.canvas.height);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    if (!vertexShader) return null;

    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!fragmentShader) return null;

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        // alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        //logToUI(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);

        return null;
    }

    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        //logToUI(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

main();