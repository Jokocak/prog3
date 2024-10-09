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
var triBufferSize; // the number of indices in the triangle buffer
var altPosition; // flag indicating whether to alter vertex positions
var vertexPositionAttrib; // where to put position for vertex shader
var altPositionUniform; // where to put altPosition flag for vertex shader

/* My variables */
var canvas;
var worldMatrix;
var matWorldUniformLocation;

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
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

// set up the webGL environment
function setupWebGL() {
  // Get the canvas and context
  canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
  gl = canvas.getContext("webgl"); // get a webgl object from it

  try {
    if (gl == null) {
      throw "unable to create gl context -- is your browser gl ready?";
    } else {
      gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
      gl.clearDepth(1.0); // use max when we clear the depth buffer
      gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
    }
  } catch (e) {
    // end try

    console.log(e);
  } // end catch
} // end setupWebGL

// read triangles in, load them into webgl buffers
function loadTriangles() {
  inputTriangles = getJSONFile(INPUT_TRIANGLES_URL, "triangles");
  if (inputTriangles != null) {
      var coordArray = [];
      var indexArray = [];
      var indexOffset = 0;

      for (var whichSet = 0; whichSet < inputTriangles.length; whichSet++) {
          var vertices = inputTriangles[whichSet].vertices;
          var indices = inputTriangles[whichSet].triangles;

          for (var i = 0; i < vertices.length; i++) {
              coordArray = coordArray.concat(vertices[i]);
          }

          for (var j = 0; j < indices.length; j++) {
              indexArray = indexArray.concat(indices[j].map(index => index + indexOffset));
          }

          indexOffset += vertices.length;
      }

      // Bind buffer for vertices
      vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordArray), gl.STATIC_DRAW);

      // Bind buffer for indices
      indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexArray), gl.STATIC_DRAW);

      // Track the buffer size
      triBufferSize = indexArray.length;

      console.log(coordArray);
      console.log(indexArray);
  }
}

// setup the webGL shaders
function setupShaders() {
    // Text for vertex shader code
    var vertexShaderCode = 
    [
        'precision mediump float;',
        '',
        'attribute vec3 vertexPosition;',
        'attribute vec3 vertexColor;',
        'varying vec3 fragmentColor;',
        'uniform mat4 mWorld;',
        'uniform mat4 mView;',
        'uniform mat4 mProj;',
        '',
        'void main(void)',
        '{',
        '   fragmentColor = vertexColor;',
        '   gl_Position = mProj * mView * mWorld * vec4(vertexPosition, 1.0);',
        '}'
    ].join('\n');

    // var fragmentShaderCode = 
    // [
    //     'precision mediump float;',
    //     'uniform vec3 diffuseColor;',
    //     'void main(void)',
    //     '{',
    //     '    gl_FragColor = vec4(diffuseColor, 1.0);',
    //     '}'
    // ].join('\n');

    // Text for fragment shader code
    var fragmentShaderCode = 
    [
        'precision mediump float;',
        '',
        'varying vec3 fragmentColor;',
        '',
        'void main(void)',
        '{',
        '   gl_FragColor = vec4(fragmentColor, 1.0);',
        '}'
    ].join('\n');

    // Create vertex shader with WebGL
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderCode);
    gl.compileShader(vertexShader);

    // Check if vertex shader compiled
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        throw "Vertex shader compilation error: " + gl.getShaderInfoLog(vertexShader);
    }

    // Create fragment shader with WebGL
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderCode);
    gl.compileShader(fragmentShader);

    // Check if fragment shader compiled
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        throw "Fragment shader compilation error: " + gl.getShaderInfoLog(fragmentShader);
    }

    // Create a program object with WebGL
    var shaderProgram = gl.createProgram();

    // Attach compiled vertex and fragment shaders to this shaderProgram
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);

    // Link this shaderProgram
    gl.linkProgram(shaderProgram);

    // Check if the program was able to link properly
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        throw "Shader Program linking error: " + gl.getProgramInfoLog(shaderProgram);
    }

    // Validate the program for testing, get rid of this when submitting
    gl.validateProgram(shaderProgram);

    // Check if program was valid
    if (!gl.getProgramParameter(shaderProgram, gl.VALIDATE_STATUS)) {
        throw "Shader Program validate error: " + gl.getProgramInfoLog(shaderProgram);
    }

    // Create buffer
    var triangleVertices = 
    [ // x, y, z,             R, G, B
        0.0, 0.5, 0.0,        1.0, 1.0, 0.0,
        -0.5, -0.5, 0.0,      0.7, 0.0, 1.0,
        0.5, -0.5, 0.0,       0.1, 1.0, 0.6
    ];

    // Create a buffer with WebGL, uses GPU
    var triangleVertexBufferObject = gl.createBuffer();

    // Bind a buffer to WebGL
    gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBufferObject);

    // No need to specify buffer because WebGL uses the last binded buffer
    // Must use Float32Array for triangleVertices to allow this method to work
    // gl.STATIC_DRAW sends CPU memory to GPU memory once
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);

    // Grabs the location of the position attribute
    var positionAttribLocation = gl.getAttribLocation(shaderProgram, 'vertexPosition');
    gl.vertexAttribPointer(
        positionAttribLocation, // Attribute Location
        3, // Number of elements per attribute
        gl.FLOAT, // Type of elements
        gl.FALSE, // Not normalized
        6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
        0 // Offset from the beginning of a single vertex to this attribute
    );

    // Grabs the location of the color attribute
    var colorAttribLocation = gl.getAttribLocation(shaderProgram, 'vertexColor');
    gl.vertexAttribPointer(
        colorAttribLocation, // Attribute Location
        3, // Number of elements per attribute
        gl.FLOAT, // Type of elements
        gl.FALSE, // Not normalized
        6 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
        3 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
    );

    // Enables each attribute
    gl.enableVertexAttribArray(positionAttribLocation);
    gl.enableVertexAttribArray(colorAttribLocation);

    // Set Program to Use
    gl.useProgram(shaderProgram);

    // Locations for GPU memory of these uniforms
    matWorldUniformLocation = gl.getUniformLocation(shaderProgram, 'mWorld');
    var matViewUniformLocation = gl.getUniformLocation(shaderProgram, 'mView');
    var matProjUniformLocation = gl.getUniformLocation(shaderProgram, 'mProj');
    
    // Identity matrices in CPU
    worldMatrix = new Float32Array(16);
    var viewMatrix = new Float32Array(16);
    var projMatrix = new Float32Array(16);
    mat4.identity(worldMatrix);

    // Initialize eye, center and up vector
    // mat4.lookAt(viewMatrix, Eye, Center, UpVector);
    mat4.identity(viewMatrix);

    // projection matrix, degrees in radians, dynamically grab aspect ratio, near value, far value
    // mat4.perspective(projMatrix, glMatrix.toRadian(45), canvas.width / canvas.height, 0.0, 1.0);
    mat4.identity(projMatrix);

    // Send these matrices to shader
    gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
    gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
    gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);
}

var bgColor = 0;
var angle = 0;
var identityMatrix = new Float32Array(16);
mat4.identity(identityMatrix);
function renderTriangles() {
    // clear frame/depth buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    bgColor = (bgColor < 1) ? (bgColor + 0.001) : 0;
    gl.clearColor(bgColor, 0, 0, 1.0);

    angle = performance.now() / 1000 / 6 * 2 * Math.PI;
    mat4.rotate(worldMatrix, identityMatrix, angle, [0, 1, 0]);
    gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);

    // Render the triangle
    gl.drawArrays(gl.TRIANGLES,0,3);
    
    requestAnimationFrame(renderTriangles);

    // Below is ???

    // vertex buffer: activate and feed into vertex shader
    // gl.uniform1i(altPositionUniform, altPosition); // feed

    // Render the triangle
    // gl.drawArrays(gl.TRIANGLES,0,3);
}

/* MAIN -- HERE is where execution begins after window load */

function main() {
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL
} // end main
