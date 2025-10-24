precision mediump float;

varying highp vec2 vTextureCoord;
uniform sampler2D uSamplerRealtime;

void main(void) {
    vec4 color = texture2D(uSamplerRealtime, vTextureCoord);
    gl_FragColor = vec4(color.b, color.g, color.r, color.a);
}