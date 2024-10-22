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

// var vertexBuffers;
// var colorBuffers;
var indexBuffers;
var indexCounts;

var shaderProgram;
var modelMatrix;
var viewMatrix;
var projectionMatrix;
var modelMatrices = [];  // Array to store model matrices for each triangle set
var highlightedTriangle = -1;  // No selection initially

/* Input Globals */
// TODO - Organize variables

/* WebGL Globals */
// TODO - Organize variables

// For multiple sets
var vertexBuffers = [];
var colorBuffers = [];
var triSetSizes = [];
var triangleBuffers = [];
var modelMatrixULoc;

// Enumerations for
const HighlightShift = {
  RESET: -1,
  INCREMENT: 0,
  DECREMENT: 1,
}

var inputTriangles;

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
  inputTriangles = getJSONFile(inputURL,"triangles");

  if (inputTriangles != String.null) {
    var whichSetVert; // index of vertex in current triangle set
    var whichSetTri; // index of triangle in current triangle set
    var vtxToAdd; // vtx coords to add to the coord array
    var triToAdd; // tri indices to add to the index array

    // Iterate through each set of tris in the input file
    numTriangleSets = inputTriangles.length;
    for (var whichSet=0; whichSet<numTriangleSets; whichSet++) {
      // Set up the vertex coord array for this tri set
      inputTriangles[whichSet].coordArray = [];

      // Add vertices to input triangles
      for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
          vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
          inputTriangles[whichSet].coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
      }

      // Send the vertex coords to webGL
      vertexBuffers[whichSet] = gl.createBuffer(); // init empty vertex coord buffer for current set
      gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichSet]); // activate that buffer
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(inputTriangles[whichSet].coordArray),gl.STATIC_DRAW); // coords to that buffer

      // Set up the color array for this tri set
      inputTriangles[whichSet].colorArray = [];

      // Add diffuse color to color array
      var diffuseColor = inputTriangles[whichSet].material.diffuse;
      inputTriangles[whichSet].colorArray.push(diffuseColor[0], diffuseColor[1], diffuseColor[2]);

      // // Add colors to input triangles
      // for (whichSetCol=0; whichSetCol<inputTriangles[whichSet].material.length; whichSetCol++) {
  
      // }

      // Send the triangle colors to WebGL
      colorBuffers[whichSet] = gl.createBuffer(); // Init empty buffer for colors
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffers[whichSet]); // Activate color buffer
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(inputTriangles[whichSet].colorArray), gl.STATIC_DRAW); // Coords to color buffer
        
      // Set up the triangle index array
      inputTriangles[whichSet].indexArray = [];

      // Create a list of tri indices for this tri set
      triSetSizes[whichSet] = inputTriangles[whichSet].triangles.length;

      // Create a list of tri indices for this tri set and adjusts indices across sets
      triSetSizes[whichSet] = inputTriangles[whichSet].triangles.length;
      for (whichSetTri=0; whichSetTri<triSetSizes[whichSet]; whichSetTri++) {
          triToAdd = inputTriangles[whichSet].triangles[whichSetTri];
          inputTriangles[whichSet].indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
      }

      // Send the triangle indices to WebGL
      triangleBuffers[whichSet] = gl.createBuffer(); // init empty triangle index buffer for current tri set

      // Activate that buffer
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffers[whichSet]);

      // Feed indices to that buffer to WebGL
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(inputTriangles[whichSet].indexArray),gl.STATIC_DRAW);
    }
  }
}

// // read triangles in, load them into webgl buffers
// function loadTriangles(inputURL) {
//   var inputTriangles = getJSONFile(inputURL, "triangles");
//   if (inputTriangles != String.null) {
//     var whichSetVert; // index of vertex in current triangle set
//     var whichSetTri; // index of triangle in current triangle set
//     coordArray = []; // 1D array of vertex coords for WebGL
//     indexArray = [];
//     colorArray = [];
//     var vtxBufferSize = 0; // the number of vertices in the vertex buffer
//     var vtxToAdd = []; // vtx coords to add to the coord array
//     var colorToAdd = [];
//     var indexOffset = vec3.create(); // the index offset for the current set
//     var triToAdd = vec3.create(); // tri indices to add to the index array

//     for (var whichSet = 0; whichSet < inputTriangles.length; whichSet++) {
//       vec3.set(indexOffset, vtxBufferSize, vtxBufferSize, vtxBufferSize);

//       // Grab diffuse color
//       var diffuseColor = inputTriangles[whichSet].material.diffuse;
//       //console.log(diffuseColor);

//       // Set up the vertex coord array
//       for (
//         whichSetVert = 0;
//         whichSetVert < inputTriangles[whichSet].vertices.length;
//         whichSetVert++
//       ) {
//         vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
//         coordArray.push(vtxToAdd[0], vtxToAdd[1], vtxToAdd[2]);
//         // console.log(inputTriangles[whichSet].vertices[whichSetVert]);

//         colorArray.push(diffuseColor[0], diffuseColor[1], diffuseColor[2]);
//       }

//       // Set up the index array
//       for (
//         whichSetTri = 0;
//         whichSetTri < inputTriangles[whichSet].triangles.length;
//         whichSetTri++
//       ) {
//         vec3.add(
//           triToAdd,
//           indexOffset,
//           inputTriangles[whichSet].triangles[whichSetTri]
//         );
//         indexArray.push(triToAdd[0], triToAdd[1], triToAdd[2]);
//       }

//       // Update both buffer sizes
//       vtxBufferSize += inputTriangles[whichSet].vertices.length;
//       triBufferSize += inputTriangles[whichSet].triangles.length;
//     }

//     // console.log(coordArray.length);

//     // Set the size of the buffer for renderTriangles()
//     triBufferSize = indexArray.length;

//     // Initialzie empty vertex coord buffer, activate the buffer,
//     // and give location of the buffer
//     vertexBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
//     gl.bufferData(
//       gl.ARRAY_BUFFER,
//       new Float32Array(coordArray),
//       gl.STATIC_DRAW
//     );

//     // Initialize empty triangle index buffer, activate the buffer,
//     // and give location of the buffer
//     triangleBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);
//     gl.bufferData(
//       gl.ELEMENT_ARRAY_BUFFER,
//       new Uint16Array(indexArray),
//       gl.STATIC_DRAW
//     );

//     // Initialize empty color buffer, activate the buffer,
//     // and give location of the buffer
//     colorBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
//     gl.bufferData(
//       gl.ARRAY_BUFFER,
//       new Float32Array(colorArray),
//       gl.STATIC_DRAW
//     );

//     // Initialize empty index buffer, activate the buffer,
//     // and give location of the buffer
//     indexBuffer = gl.createBuffer();
//     gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
//     gl.bufferData(
//       gl.ARRAY_BUFFER,
//       new Float32Array(indexArray),
//       gl.STATIC_DRAW
//     );

//     console.log(coordArray);
//     console.log(indexArray);
//     console.log(colorArray);
//   }
// }

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
    'uniform mat4 uModelMatrix;',
    'uniform mat4 uViewMatrix;',
    'uniform mat4 uProjectionMatrix;',
    'varying vec3 fragColor;',
    '',
    'void main(void)',
    '{',
    ' gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(vertexPosition, 1.0);',
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

  // Grab pointer to model matrix
  modelMatrixULoc = gl.getUniformLocation(shaderProgram, "uModelMatrix");

  // Create identity matrices for view and projection
  modelMatrix = mat4.create();
  viewMatrix = mat4.create();
  projectionMatrix = mat4.create();

  // Set perspective
  mat4.perspective(projectionMatrix, 
    glMatrix.toRadian(45),    // Field of view (45 degrees)
    canvas.width / canvas.height, // Aspect ratio
    0.1,                      // Near clipping plane
    1000.0);                  // Far clipping plane

  // Set these matrices to identity matrix
  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uViewMatrix"), false, viewMatrix);
  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uProjectionMatrix"), false, projectionMatrix);
  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelMatrix"), false, modelMatrix);
}

// render the loaded model
function renderTriangles() {
  // Clear frame/depth buffers
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Update the view matrix based on user input
  updateViewMatrix();
  
  // Render each set of triangles
  for (var whichTriSet=0; whichTriSet<numTriangleSets; whichTriSet++) {
    // Define modeling matrix
    inputTriangles[whichTriSet].mMatrix = mat4.create();

    // Logic to render highlighted triangle
    if (whichTriSet == highlightedTriangle) {
      // Create and apply scale matrix
      const scalingMatrix = mat4.create();
      mat4.scale(scalingMatrix, scalingMatrix, [1.2, 1.2, 1.2]);

      // Create scaled model matrix
      const scaledModelMatrix = mat4.create();
      mat4.multiply(scaledModelMatrix, scalingMatrix, inputTriangles[whichTriSet].mMatrix);

      // Pass scaled modeling matrix for set to shader
      gl.uniformMatrix4fv(modelMatrixULoc, false, scaledModelMatrix);

      // Vertex buffer: activate and feed into vertex shader
      gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichTriSet]); // activate
      gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

      // Triangle buffer: activate buffer
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[whichTriSet]); // activate

      // Color buffer: activate and feed into shader program
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffers[whichTriSet]);
      gl.vertexAttribPointer(vertexColorAttrib, 3, gl.FLOAT, false, 0, 0);

      // Render the image
      gl.drawElements(gl.TRIANGLES,3*triSetSizes[whichTriSet],gl.UNSIGNED_SHORT,0);

      // Move to next iteration
      continue;
    }
      
    // Pass modeling matrix for set to shader
    gl.uniformMatrix4fv(modelMatrixULoc, false, inputTriangles[whichTriSet].mMatrix);

    // Vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffers[whichTriSet]); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

    // Triangle buffer: activate buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffers[whichTriSet]); // activate

    // Color buffer: activate and feed into shader program
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffers[whichTriSet]);
    gl.vertexAttribPointer(vertexColorAttrib, 3, gl.FLOAT, false, 0, 0);

    // Render the image
    gl.drawElements(gl.TRIANGLES,3*triSetSizes[whichTriSet],gl.UNSIGNED_SHORT,0);
  }

  // Loop this function
  requestAnimationFrame(renderTriangles);
}

// // This function renders the triangles
// function renderTriangles() {
//   // Clear frame/depth buffers
//   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

//   // Update the view matrix based on user input
//   updateViewMatrix();

//   // Vertex buffer: activate and feed into vertex shader
//   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer); // activate
//   gl.vertexAttribPointer(vertexPositionAttrib, 3, gl.FLOAT, false, 0, 0);

//   // Triangle index buffer: activate and feed into shader program
//   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer);

//   // Color buffer: activate and feed into shader program
//   gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
//   gl.vertexAttribPointer(vertexColorAttrib, 3, gl.FLOAT, false, 0, 0);

//   // Render the image
//   gl.drawElements(gl.TRIANGLES, triBufferSize, gl.UNSIGNED_SHORT, 0);

//   // Loop this function
//   requestAnimationFrame(renderTriangles);
// }

// Rotates the view matrix
function rotateView(angle, axis) {
  // Create rotation matrix
  const rotationMatrix = mat4.create();

  // Check which axis is rotating
  if (axis[0] === 1 && axis[1] === 0 && axis[2] === 0) {
    mat4.fromXRotation(rotationMatrix, angle); // Create a rotation matrix around the X axis
  } 
  else if (axis[0] === 0 && axis[1] === 1 && axis[2] === 0) {
    mat4.fromYRotation(rotationMatrix, angle); // Create a rotation matrix around the Y axis
  } 
  else if (axis[0] === 0 && axis[1] === 0 && axis[2] === 1) {
    mat4.fromZRotation(rotationMatrix, angle); // Create a rotation matrix around the Z axis
  }

  // Transform the look vector
  vec4.transformMat4(LookVector, LookVector, rotationMatrix);
  
  // Update the Center position by adjusting the LookVector
  Center[0] = Eye[0] + LookVector[0];
  Center[1] = Eye[1] + LookVector[1];
  Center[2] = Eye[2] + LookVector[2];
}

// This function updates the view matrix
function updateViewMatrix() {
  // Set the view matrix uniform in your shaders
  mat4.lookAt(viewMatrix, Eye, Center, UpVector);
  gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uViewMatrix"), false, viewMatrix);
}

// Apply transformations with key presses
function handleKeyPress(event) {
  const translationStep = 0.03;
  const rotationStep = Math.PI / 180 * 1; // 3 degrees in radians

  switch (event.key) {
    // Translation for eye, lookAt, and lookUp vectors
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

    // Rotation for eye, lookAt, and lookUp vectors
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

    // Triangle selection and highlighting arrow keys
    case 'ArrowRight':
      changeHighlight(HighlightShift.INCREMENT);
      break;
    case 'ArrowLeft':
      changeHighlight(HighlightShift.DECREMENT);
      break;
    case ' ':
      changeHighlight(HighlightShift.RESET);
      break;

    // Translation for highlighted triangle
    case 'k':
      break;
    case ';':
      break;
    case 'o':
      break;
    case 'l':
      break;
    case 'i':
      break;
    case 'p':
      break;

    // Rotation for highlighted triangle
    case 'K':
      break;
    case ':':
      break;
    case 'O':
      break;
    case 'L':
      break;
    case 'I':
      break;
    case 'P':
      break;
  }
}

// Function to change highlighted shape
function changeHighlight(operation) {
  // Determines which highlight to change
  switch (operation) {
    case HighlightShift.INCREMENT:
      // Cycle back to start
      if (highlightedTriangle + 1 >= inputTriangles.length) {
        highlightedTriangle = 0;
      } else { // Otherwise increment
        highlightedTriangle++;
      }
      break;
    case HighlightShift.DECREMENT:
      // Cycle back to end
      if (highlightedTriangle - 1 < 0) {
        highlightedTriangle = inputTriangles.length - 1;
      } else { // Otherwise decrement
        highlightedTriangle--;
      }
      break;
    case HighlightShift.RESET:
      highlightedTriangle = -1;
      break;
  }
}


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

  // Draw the triangles using WebGL
  renderTriangles();
}
