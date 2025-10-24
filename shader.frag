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

  float glow = 0.0;
  float offsetAmount = 1.0 / min(u_resolution.x, u_resolution.y);
  for(float i = -3.0;i <= 3.0;i += 1.0){
    for(float j = -3.0;j <= 3.0;j += 1.0){
      vec2 offset = vec2(i,j) * offsetAmount;
      vec4 f0b = texture2D(uSampler,offset+uv);
      vec4 f1b = texture2D(uSamplerRealtime,offset+uv);
      float m = dot(abs( (1. - f0b.rgb) - (1. - f1b.rgb) ),vec3(0.333));
      glow += m;
    }
  }
  glow /= 49.0;
  vec3 col = vec3(motion);
  float bloom = smoothstep(0.2,1. ,motion + glow * 5.2);
  bloom = pow(bloom ,2.0);
  vec3 glowColor = mix(f0.rgb,  f1.rgb, bloom);

  vec3 bloomColor = vec3(bloom) * glowColor;
 // if(bloom <= 0.1)bloomColor += f1.rgb;
  gl_FragColor = vec4(bloomColor + f1.rgb,1.);}