glShader
========

A wrapper for webgl shaders. Automatically load external shader files, compile, and extract all uniforms and attributes.

# usage

  var shader = glShader.loadShader(gl, "shader.vert","shader.frag");

  shader.begin();

  //set a uniform in the shader
  //replaces gl.uniform3fv(gl.getUniformLocation(shader,"someVector"),[1.0,0.0,0.0]);
  shader.uniforms.someVector.set([1.0,0.0,0.0]);

  //point a vertex attribute at a buffer
  //replaces
  //gl.bindBuffer(gl.ARRAY_BUFFER,buffer)
  //gl.vertexAttribPointer(gl.getAttribLocation(shader,"vertexAttribute"),3,gl.FLOAT, gl.false,0,0);
  shader.attribs.vertexAttribute.set(buffer);

  //pointer method offers a little more flexibility allowing to input type, stride, and offset
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer2);
  shader.attribs.otherAttribute.pointer(gl.UNSIGNED_SHORT, gl.false,0,12);
  
  //now draw something with your method of choice
  
  shader.end();
