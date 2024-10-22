/* GLOBAL CONSTANTS AND VARIABLES */

// Format for my HTTP get request calls
// https://jokocak.github.io/prog3/triangles.json

/* assignment specific globals */
const WIN_Z = 0; // default graphics window z coord in world space
const WIN_LEFT = 0;
const WIN_RIGHT = 1; // default left and right x coords in world space
const WIN_BOTTOM = 0;
const WIN_TOP = 1; // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL =
  "https://ncsucgclass.github.io/prog3/triangles.json"; // triangles file loc
  const INPUT_TRIANGLES_TWO_URL =
  "https://ncsucgclass.github.io/prog3/triangles2.json";
const INPUT_ELLIPSOIDS_URL =
  "https://ncsucgclass.github.io/prog3/ellipsoids.json";
//const INPUT_SPHERES_URL = "https://ncsucgclass.github.io/prog3/spheres.json"; // spheres file loc
var Eye = new vec4.fromValues(0.5, 0.5, -0.5, 1.0); // default eye position in world space
var Center = new vec4.fromValues(0.5, 0.5, 0.0, 1.0);
var UpVector = new vec4.fromValues(0.0, 1.0, 0.0, 1.0);
var LookVector = new vec4.fromValues(0.0, 0.0, 1.0, 1.0);

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize = 0; // the number of indices in the triangle buffer
var altPosition; // flag indicating whether to alter vertex positions
var vertexPositionAttrib; // where to put position for vertex shader
var altPositionUniform; // where to put altPosition flag for vertex shader

/* My variables */
var canvas;
var worldMatrix;
var matWorldUniformLocation;

var coordArray;
var indexArray;
var colorArray;
var colorBuffer;

var shaderProgram;
var viewMatrix;
var projectionMatrix;

// ASSIGNMENT HELPER FUNCTIONS

/* Get the JSON file from the passed URL */
function getJSONFile(url, descr) {
  try {
    if (typeof url !== "string" || typeof descr !== "string")
      throw "getJSONFile: parameter not a string";
    else {
      var httpReq = new XMLHttpRequest(); // a new http request
      httpReq.open("GET", url, false); // init the request
      httpReq.send(null); // send the request
      var startTime = Date.now();
      while (
        httpReq.status !== 200 &&
        httpReq.readyState !== XMLHttpRequest.DONE
      ) {
        if (Date.now() - startTime > 3000) break;
      } // until its loaded or we time out after three seconds
      if (httpReq.status !== 200 || httpReq.readyState !== XMLHttpRequest.DONE)
        throw "Unable to open " + descr + " file!";
      else return JSON.parse(httpReq.response);
    } // end if good params
  } catch (e) {
    // end try

    console.log(e);
    return String.null;
  }
} // end get input spheres

// Set up the WebGL environment
function setupWebGL() {
  // Get the canvas and context
  canvas = document.getElementById("myWebGLCanvas");
  gl = canvas.getContext("webgl");

  // Check if WebGL initialized properly
  if (gl == null) {
    throw "unable to create gl context -- is your browser gl ready?";
  }

  // Use black when we clear the frame buffer
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Use max when we clear the depth buffer
  gl.clearDepth(1.0);

  // Use hidden surface removal (with zbuffering)
  gl.enable(gl.DEPTH_TEST);
}

// read triangles in, load them into webgl buffers
function loadTriangles(inputURL) {
  var inputTriangles = getJSONFile(inputURL, "triangles");
  if (inputTriangles != String.null) {
    var whichSetVert; // index of vertex in current triangle set
    var whichSetTri; // index of triangle in current triangle set
    coordArray = []; // 1D array of vertex coords for WebGL
    indexArray = [];
    colorArray = [];
    var vtxBufferSize = 0; // the number of vertices in the vertex buffer
    var vtxToAdd = []; // vtx coords to add to the coord array
    var colorToAdd = [];
    var indexOffset = vec3.create(); // the index offset for the current set
    var triToAdd = vec3.create(); // tri indices to add to the index array

    for (var whichSet = 0; whichSet < inputTriangles.length; whichSet++) {
      vec3.set(indexOffset, vtxBufferSize, vtxBufferSize, vtxBufferSize);

      // Grab diffuse color
      var diffuseColor = inputTriangles[whichSet].material.diffuse;
      //console.log(diffuseColor);

      // Set up the vertex coord array
      for (
        whichSetVert = 0;
        whichSetVert < inputTriangles[whichSet].vertices.length;
        whichSetVert++
      ) {
        vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
        coordArray.push(vtxToAdd[0], vtxToAdd[1], vtxToAdd[2]);
        // console.log(inputTriangles[whichSet].vertices[whichSetVert]);

        colorArray.push(diffuseColor[0], diffuseColor[1], diffuseColor[2]);
      }

      // Set up the index array
      for (
        whichSetTri = 0;
        whichSetTri < inputTriangles[whichSet].triangles.length;
        whichSetTri++
      ) {
        vec3.add(
          triToAdd,
          indexOffset,
          inputTriangles[whichSet].triangles[whichSetTri]
        );
        indexArray.push(triToAdd[0], triToAdd[1], triToAdd[2]);
      }

      // Update both buffer sizes
      vtxBufferSize += inputTriangles[whichSet].vertices.length;
      triBufferSize += inputTriangles[whichSet].triangles.length;
    }

    // console.log(coordArray.length);

    // Set the size of the buffer for renderTriangles()
    triBufferSize = indexArray.length;

    // Initialzie empty vertex coord buffer, activate the buffer,
    // and give location of the buffer
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(coordArray),
      gl.STATIC_DRAW
    );

    // Initialize empty triangle index buffer, activate the buffer,
    // and give location of the buffer
    triangleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indexArray),
      gl.STATIC_DRAW
    );

    // Initialize empty color buffer, activate the buffer,
    // and give location of the buffer
    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(colorArray),
      gl.STATIC_DRAW
    );

    console.log(coordArray);
    console.log(indexArray);
    console.log(colorArray);
  }
}

// Setup the webGL shaders
function setupShaders() {
  // Define fragment shader in essl using es6 template strings
  var fragmentShaderCode = 
  [
    'precision mediump float;',
    'varying vec3 fragColor;',
    '',
    'void main(void)',
    '{',
    ' gl_FragColor = vec4(fragColor, 1.0);',
    '}'
  ].join('\n');

  // Define vertex shader in essl using es6 template strings
  var vertexShaderCode =
  [
    'attribute vec3 vertexPosition;',
    'attribute vec3 vertexColor;',
    'uniform mat4 uViewMatrix;',
    'uniform mat4 uProjectionMatrix;',
    'varying vec3 fragColor;',
    '',
    'void main(void)',
    '{',
    ' gl_Position = uProjectionMatrix * uViewMatrix * vec4(vertexPosition, 1.0);',
    'fragColor = vertexColor;',
    '}'
  ].join('\n');

  // Create vertex shader with WebGL
  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderCode);
  gl.compileShader(vertexShader);

  // Check if vertex shader compiled
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    throw (
      "Vertex shader compilation error: " + gl.getShaderInfoLog(vertexShader)
    );
  }

  // Create fragment shader with WebGL
  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderCode);
  gl.compileShader(fragmentShader);

  // Check if fragment shader compiled
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    throw (
      "Fragment shader compilation error: " +
      gl.getShaderInfoLog(fragmentShader)
    );
  }

  // Create a program object with WebGL
  shaderProgram = gl.createProgram();
  // var shaderProgram = gl.createProgram();

  // Attach compiled vertex and fragment shaders to this shaderProgram
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);

  // Link this shaderProgram
  gl.linkProgram(shaderProgram);

  // Check if the program was able to link properly
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    throw (
      "Shader Program linking error: " + gl.getProgramInfoLog(shaderProgram)
    );
  }

  // Set Program to Use
  gl.useProgram(shaderProgram);

  // Get pointer to vertex shader input
  vertexPositionAttrib = gl.getAttribLocation(shaderProgram, "vertexPosition");
  gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array

  // Get pointer to vertex color input
  vertexColorAttrib = gl.getAttribLocation(shaderProgram, "vertexColor");
  gl.enableVertexAttribArray(vertexColorAttrib);

  // Create identity matrices for view and projection
  viewMatrix = mat4.create();
  projectionMatrix = mat4.create();

  // mat4.perspective(projectionMatrix, 
  //   glMatrix.toRadian(45),    // Field of view (45 degrees)
  //   canvas.width / canvas.height, // Aspect ratio
  //   0.1,                      // Near clipping plane
  //   1000.0);                  // Far clipping plane

  // Set these matrices to identity matrix
  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uViewMatrix"), false, viewMatrix);
  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uProjectionMatrix"), false, projectionMatrix);
}

var bgColor = 0;
function renderTriangles() {
  // Clear frame/depth buffers
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // // Calculate color of background, goes repeatedly from red to black
  // bgColor = bgColor < 1 ? bgColor + 0.001 : 0;
  // gl.clearColor(bgColor, 0, 0, 1.0);

  // Update the view matrix based on user input
  updateViewMatrix();

  // Vertex buffer: activate and feed into vertex shader
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); // activate
  gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);

  // Triangle index buffer: activate and feed into shader program
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);

  // Color buffer: activate and feed into shader program
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.vertexAttribPointer(vertexColorAttrib, 3, gl.FLOAT, false, 0, 0);

  // Render the image
  gl.drawElements(gl.TRIANGLES, triBufferSize, gl.UNSIGNED_SHORT, 0);

  // Loop this function
  requestAnimationFrame(renderTriangles);
}

// Rotates the view matrix
function rotateView(angle, axis) {
  const rotationMatrix = mat4.create();
  mat4.rotate(rotationMatrix, mat4.create(), angle, axis);

  // Update the LookVector by multiplying it with the rotation matrix
  vec4.transformMat4(LookVector, LookVector, rotationMatrix);

  // Update the Center position by adjusting the LookVector
  Center[0] = Eye[0] + LookVector[0];
  Center[1] = Eye[1] + LookVector[1];
  Center[2] = Eye[2] + LookVector[2];
}

// This function updates the view matrix
function updateViewMatrix() {
  //const viewMatrix = mat4.create();
  mat4.lookAt(viewMatrix, Eye, Center, UpVector);

  // Set the view matrix uniform in your shaders
  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uViewMatrix"), false, viewMatrix);
}

// Apply transformations with key presses
function handleKeyPress(event) {
  const translationStep = 0.05;
  const rotationStep = Math.PI / 180 * 5; // 5 degrees in radians

  switch (event.key) {
    case 'a': // Translate view left along X
      Eye[0] -= translationStep;
      Center[0] -= translationStep;
      break;
    case 'd': // Translate view right along X
      Eye[0] += translationStep;
      Center[0] += translationStep;
      break;
    case 'w': // Translate view forward along Z
      Eye[2] += translationStep;
      Center[2] += translationStep;
      break;
    case 's': // Translate view backward along Z
      Eye[2] -= translationStep;
      Center[2] -= translationStep;
      break;
    case 'q': // Translate view up along Y
      Eye[1] += translationStep;
      Center[1] += translationStep;
      break;
    case 'e': // Translate view down along Y
      Eye[1] -= translationStep;
      Center[1] -= translationStep;
      break;

    case 'A': // Rotate view left (yaw) around Y axis
      rotateView(rotationStep, [0, 1, 0]);
      break;
    case 'D': // Rotate view right (yaw) around Y axis
      rotateView(-rotationStep, [0, 1, 0]);
      break;
    case 'W': // Rotate view forward (pitch) around X axis
      rotateView(rotationStep, [1, 0, 0]);
      break;
    case 'S': // Rotate view backward (pitch) around X axis
      rotateView(-rotationStep, [1, 0, 0]);
      break;
  }
}

// function setupProjectionMatrix() {
//   // Create a perspective projection matrix
//   mat4.perspective(projectionMatrix, 
//                    glMatrix.toRadian(45),    // Field of view (45 degrees)
//                    canvas.width / canvas.height, // Aspect ratio
//                    0.1,                      // Near clipping plane
//                    1000.0);                  // Far clipping plane
// }


/* MAIN -- HERE is where execution begins after window load */
function main() {
  // Set up the WebGL environment
  setupWebGL();

  // Load in the triangles from tri file
  // loadTriangles(INPUT_TRIANGLES_URL);
  loadTriangles(INPUT_TRIANGLES_TWO_URL);

  // Setup the webGL shaders
  setupShaders();

  // Add keyboard event listener
  window.addEventListener("keydown", handleKeyPress);

  // Setup projection matrix
  //setupProjectionMatrix();

  // Draw the triangles using WebGL
  renderTriangles();
}
