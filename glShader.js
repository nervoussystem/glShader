/*
	glShader
	Copyright (c) 2013, Nervous System, inc. All rights reserved.
	
	Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

  * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.
  * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation 
    and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

	uses some ideas (and code) from gl-shader https://github.com/mikolalysenko/gl-shader
	however some differences include saving uniform locations and querying gl to get uniforms and attribs instead of parsing files and uses normal syntax instead of fake operator overloading which is a confusing pattern in Javascript.
*/

(function(_global) {
  "use strict";

  var shim = {};
  if (typeof(exports) === 'undefined') {
    if(typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
      shim.exports = {};
      define(function() {
        return shim.exports;
      });
    } else {
      //this thing lives in a browser, define its namespaces in global
      shim.exports = typeof(window) !== 'undefined' ? window : _global;
    }
  }
  else {
    //this thing lives in commonjs, define its namespaces in exports
    shim.exports = exports;
  }
  (function(exports) {


function Shader(gl, prog) {
  this.gl = gl;
  this.program = prog;
  this.uniforms = {};
  this.attribs = {};
}

Shader.prototype.begin = function() {
  this.gl.useProgram(this.program);
  this.enableAttribs();
}

Shader.prototype.end = function() {
	this.disableAttribs();
}

Shader.prototype.enableAttribs = function() {
  for(var attrib in this.attribs) {
	this.attribs[attrib].enable();
  }
}
Shader.prototype.disableAttribs = function() {
  for(var attrib in this.attribs) {
	this.attribs[attrib].disable();
  }
}

function makeVectorUniform(gl, shader, location, obj, type, d, name) {
  var uniformObj = {};
  uniformObj.location = location;
  if(d > 1) {
    type += "v";
  }
  var setter = new Function("gl", "prog", "loc", "v", "gl.uniform" + d + type + "(loc, v)");
  uniformObj.set = setter.bind(undefined, gl, shader.program,location);
  Object.defineProperty(obj, name, {
    value:uniformObj,
    enumerable: true
  });
}

function makeMatrixUniform(gl, shader, location, obj, d, name) {
  var uniformObj = {};
  uniformObj.location = location;
  var setter = new Function("gl", "prog", "loc","v", "gl.uniformMatrix" + d + "fv(loc, false, v)");
  uniformObj.set = setter.bind(undefined, gl, shader.program,location);
  Object.defineProperty(obj, name, {
    value:uniformObj,
    enumerable: true
  });
}

function makeVectorAttrib(gl, shader, location, obj, d, name) {
  var out = {};
  out.set = function setAttrib(buffer,type) {
	gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
	gl.vertexAttribPointer(location, d, type||gl.FLOAT, gl.FALSE, 0, 0);
  }
  out.pointer = function attribPointer(type, normalized, stride, offset) {
    gl.vertexAttribPointer(location, d, type||gl.FLOAT, normalized?gl.TRUE:gl.FALSE, stride||0, offset||0);
  };
  out.enable = function enableAttrib() {
    gl.enableVertexAttribArray(location);
  };
  out.disable = function disableAttrib() {
    gl.disableVertexAttribArray(location);
  };
  out.location = location;
  Object.defineProperty(obj, name, {
	value: out,
	enumerable: true
  });
}

function setupUniform(gl,shader, uniform,loc) {
	switch(uniform.type) {
		case gl.INT:
		case gl.BOOL:
		case gl.SAMPLER_2D:
		case gl.SAMPLER_CUBE:
			makeVectorUniform(gl,shader,loc, shader.uniforms, "i",1,uniform.name);
			break;
		case gl.INT_VEC2:
		case gl.BOOL_VEC2:
			makeVectorUniform(gl,shader,loc, shader.uniforms, "i",2,uniform.name);
			break;
		case gl.INT_VEC3:
		case gl.BOOL_VEC3:
			makeVectorUniform(gl,shader,loc, shader.uniforms, "i",3,uniform.name);
			break;
		case gl.INT_VEC4:
		case gl.BOOL_VEC4:
			makeVectorUniform(gl,shader,loc, shader.uniforms, "i",4,uniform.name);
			break;
		case gl.FLOAT:
			makeVectorUniform(gl,shader,loc, shader.uniforms, "f",1,uniform.name);
			break;
		case gl.FLOAT_VEC2:
			makeVectorUniform(gl,shader,loc, shader.uniforms, "f",2,uniform.name);
			break;
		case gl.FLOAT_VEC3:
			makeVectorUniform(gl,shader,loc, shader.uniforms, "f",3,uniform.name);
			break;
		case gl.FLOAT_VEC4:
			makeVectorUniform(gl,shader,loc, shader.uniforms, "f",4,uniform.name);
			break;
		case gl.FLOAT_MAT2:
			makeMatrixUniform(gl,shader,loc, shader.uniforms, 2,uniform.name);
			break;
		case gl.FLOAT_MAT3:
			makeMatrixUniform(gl,shader,loc, shader.uniforms, 3,uniform.name);
			break;
		case gl.FLOAT_MAT4:
			makeMatrixUniform(gl,shader,loc, shader.uniforms, 4,uniform.name);
			break;
		default:
			throw new Error("Invalid uniform type in shader: " +shader);
			break;
	}
}

function setupAttrib(gl,shader,attrib,location) {
	var len = 1;
	switch(attrib.type) {
		case gl.FLOAT_VEC2:
			len = 2;
			break;
		case gl.FLOAT_VEC3:
			len = 3;
			break;
		case gl.FLOAT_VEC4:
			len = 4;
			break;
	}
	makeVectorAttrib(gl, shader, location,shader.attribs, len, attrib.name);
}

function getShader(gl, src, type) {
    var shader;
    //decides if it's a fragment or vertex shader

    if (type == "fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    }
    else if (type == "vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    }
    else {
        return null;
    }
    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function setupShaderProgram(shaderProgram, vertexShader, fragmentShader,callback) {
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }
    callback(shaderProgram);
}


var glShader = {};
glShader.makeShader = function(gl,program,shader) {
	var totalUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
	shader = shader || new Shader(gl,program);
	for(var i=0;i<totalUniforms;++i) {
		var uniform = gl.getActiveUniform(program, i);
		setupUniform(gl,shader, uniform,gl.getUniformLocation(program, uniform.name));
	}
	var totalAttribs = gl.getProgramParameter(program,gl.ACTIVE_ATTRIBUTES);
	for(var i=0;i<totalAttribs;++i) {
		var attrib = gl.getActiveAttrib(program, i);
		setupAttrib(gl,shader,attrib,i);
	}
	return shader;
}

glShader.loadShader = function(gl,vertexFile, fragmentFile) {
    var shaderProgram = gl.createProgram();
	var shader = new Shader(gl,shaderProgram);
    var fragShader, vertShader;
    var loaded = 0;
    var xmlhttp;
    xmlhttp = new XMLHttpRequest();
    loadXMLDoc(vertexFile, function(txt) {vertShader = getShader(gl, txt, "vertex");if(++loaded == 2) setupShaderProgram(shaderProgram, vertShader,fragShader,function(prog) {glShader.makeShader(gl,prog,shader);})});
    loadXMLDoc(fragmentFile, function(txt) {fragShader = getShader(gl, txt, "fragment");if(++loaded == 2) setupShaderProgram(shaderProgram, vertShader,fragShader,function(prog) {glShader.makeShader(gl,prog,shader);})});
    return shader;
}

if(typeof(exports) !== 'undefined') {
    exports.glShader = glShader;
}

})(shim.exports);
})(this);