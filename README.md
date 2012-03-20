mqo.three.js
============
mqo.three.js is a mqo parser for three.js.

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
        <script src="mqo.three.js"></script>
        <script>
          window.addEventListener('load', function() {
            var camera, scene, renderer, meshes;

            MqoLoader.load({
              url : 'assets/miku01.mqo'
              , MaterialConstructor : THREE.MeshPhongMaterial
              , texturePath : 'assets'
              , callback : function(out) {
                  meshes = out;
                  init();
                  animate();
              }
            });

            var init = function() {
              scene = new THREE.Scene();

              camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 100 );
              camera.position.z = 5;
              scene.add( camera );

              scene.add( new THREE.DirectionalLight(0x7f7f7f));
              scene.add( new THREE.AmbientLight(0xc0c0c0));

              for(var i = 0; i < meshes.length; ++i) {
                scene.add( meshes[i] );
              }

              renderer = new THREE.WebGLRenderer();
              renderer.setSize( window.innerWidth, window.innerHeight );
              document.body.appendChild( renderer.domElement );
            }

            var animate = function() {
              requestAnimationFrame(animate);
              render();
            }

            var render = function () {
              for(var i = 0; i < meshes.length; ++i) {
                  meshes[i].rotation.y += 0.01;
              }
              renderer.render( scene, camera );
            }
          }, false);

        </script>
      </head>
    </html>

