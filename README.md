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
        <script src="js/Three.js"></script>
        <script src="mqoparser.js"></script>
        <script src="mqoconverter.js"></script>
        <script>
          window.addEventListener('load', function() {
            var camera, scene, renderer, mesh;

            MqoLoader.load('asset/miku01.mqo', function(mqo) {
              mesh = MqoLoader.toTHREEJS(mqo, {
                texturePath : 'asset'
                , MaterialConstructor : THREE.MeshPhongMaterial
              });
              init();
              animate();
            });

            var init = function() {
              scene = new THREE.Scene();

              camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 100 );
              camera.position.z = 5;
              scene.add( camera );

              scene.add( new THREE.DirectionalLight(0x7f7f7f));
              scene.add( new THREE.AmbientLight(0xc0c0c0));

              scene.add( mesh );

              renderer = new THREE.WebGLRenderer();
              renderer.setSize( window.innerWidth, window.innerHeight );
              document.body.appendChild( renderer.domElement );
            }

            var animate = function() {
              requestAnimationFrame(animate);
              render();
            }

            var render = function () {
              mesh.rotation.y += 0.01;
              renderer.render( scene, camera );
            }
          }, false);

        </script>
      </head>
    </html>
