mqo.three.js
============
mqo.three.js is a mqo importer for three.js.

Demo
----
* [demo1](http://www18.ocn.ne.jp/~nyamadan/dev/webgl/mqo/demo1.html)
* [demo2](http://www18.ocn.ne.jp/~nyamadan/dev/webgl/mqo/demo2.html)

Usage
-----
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <script src="Three.js"></script>
        <script src="mqoparser.js"></script>
        <script src="mqoconverter.js"></script>
        <style>
          body {
            margin: 0px;
            background: #C0C0C0;
            overflow: hidden;
          };
        </style>
        <script>
          window.addEventListener('load', function() {
            var camera, scene, renderer, mesh;

            MqoParser.load('asset/geometry.mqo', function(mqo){
              mesh = MqoConverter.toTHREEJS(mqo, {
                texturePath : 'asset'
              });

              init();
              animate();
            });

            var init = function() {
              scene = new THREE.Scene();

              camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 100 );
              camera.position.z = 2;
              scene.add( camera );

              scene.add( new THREE.DirectionalLight(0x7f7f7f));
              scene.add( new THREE.AmbientLight(0xc0c0c0));

              var axis =  new THREE.AxisHelper();
              axis.scale.x = 0.01;
              axis.scale.y = 0.01;
              axis.scale.z = 0.01;
              scene.add(axis);

              scene.add(mesh);

              renderer = new THREE.WebGLRenderer();
              renderer.setSize( window.innerWidth, window.innerHeight );

              document.body.appendChild( renderer.domElement );
            }

            var animate = function() {
              if(mesh != null) {
                mesh.rotation.x += 0.005;
                mesh.rotation.y += 0.02;
              }
              requestAnimationFrame(animate);
              render();
            }

            var render = function () {
              renderer.render( scene, camera );
            }
          }, false);
        </script>
      </head>
    </html>

