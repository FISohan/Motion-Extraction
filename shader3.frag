precision highp float;
varying highp vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform sampler2D uSamplerRealtime;
uniform highp vec2 u_resolution;

void main(void) {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  
  uv.y = 1.0 - uv.y;
  vec4 f0 = texture2D(uSampler,uv);
  vec4 f1 = texture2D(uSamplerRealtime,uv);
  vec4 if0 = vec4(1. - f0.rgb,0.5);
  vec4 if1 = vec4(1. - f1.rgb,0.5); 
  vec3 diff = abs(if0.rgb - if1.rgb);
  float motion = dot(diff,vec3(0.333));

  gl_FragColor = vec4(vec3(motion),1.);}