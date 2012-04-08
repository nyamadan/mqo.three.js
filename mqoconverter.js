(function(global) {
  global.MqoLoader = global.MqoLoader || {};
  var MqoLoader = global.MqoLoader;

  MqoLoader.toTHREEJS = function(mqo, options) {
    if(!options) {
      options = {};
    }

    var texturePath = options.texturePath || '.';
    var MaterialConstructor = options.MaterialConstructor || THREE.MeshPhongMaterial;

    //親オブジェクトを格納する
    var parentObjects = [];
    parentObjects[0] = new THREE.Object3D

    for (var i = 0, len = mqo.meshes.length; i < len; ++i) {
      var mqoMesh = mqo.meshes[i];
      var object = convertMesh(mqoMesh, mqo.material, texturePath, MaterialConstructor);
      //親オブジェクトにオブジェクトを登録する
      parentObjects[mqoMesh.depth].add(object);
      //子オブジェクト保存しておく
      parentObjects[mqoMesh.depth + 1] = object;
    }
    return parentObjects[0];
  }

  var convertMesh = function(mqoMesh, mqoMaterials, texturePath, MaterialConstructor) {
    var geometry = new THREE.Geometry();

    // マテリアルリスト
    for(var i = 0; i < mqoMaterials.materialList.length; ++i) {
      var mqoMaterial = mqoMaterials.materialList[i];
      var material = new MaterialConstructor();
      if(material.color) {
        material.color.setRGB(
          mqoMaterial.col[0] * mqoMaterial.dif,
          mqoMaterial.col[1] * mqoMaterial.dif,
          mqoMaterial.col[2] * mqoMaterial.dif
        );
      }

      if(material.ambient) {
        material.ambient.setRGB(
          mqoMaterial.col[0] * mqoMaterial.amb,
          mqoMaterial.col[1] * mqoMaterial.amb,
          mqoMaterial.col[2] * mqoMaterial.amb
        );
      }

      if(material.specular) {
        material.specular.setRGB(
          mqoMaterial.col[0] * mqoMaterial.spc,
          mqoMaterial.col[1] * mqoMaterial.spc,
          mqoMaterial.col[2] * mqoMaterial.spc
        );
      }

      if(mqoMaterial.tex){
         material.map = THREE.ImageUtils.loadTexture(texturePath + '/' + mqoMaterial.tex);
      }

      material.shiness = mqoMaterial.power;
      material.opacity = mqoMaterial.col[3]

      geometry.materials.push(material);
    }

    // 頂点リスト
    var scaling = 0.01
    for(var i = 0; i < mqoMesh.vertices.length; ++i) {
      geometry.vertices.push(new THREE.Vertex(new THREE.Vector3(
        mqoMesh.vertices[i][0] * scaling,
        mqoMesh.vertices[i][1] * scaling,
        mqoMesh.vertices[i][2] * scaling
      )));
    }

    // チェック
    var smoothingValue = Math.cos(mqoMesh.facet * Math.PI / 180);
    var checkVertexNormalize = function(n, vn)
    {
      var c = n[0] * vn[0] + n[1] * vn[1] + n[2] * vn[2];
      return (c > smoothingValue) ? vn : n;
    };

    // indices と uv を作成
    for (var i = 0; i < mqoMesh.faces.length; ++i) {
      var face = mqoMesh.faces[i];
      var vIndex = face.v;
      var index = geometry.vertices.length;

      if (face.vNum == 3) {
        // 頂点インデックス
        var face3 = new THREE.Face3(vIndex[2], vIndex[1], vIndex[0], undefined, undefined, face.m[0]);
        geometry.faces.push(face3);

        // 法線
        var n = face.n;
        var tn = []
        for(var j = 0; j < 3; ++j) {
          var vn = mqoMesh.vertNorms[vIndex[j]];
          tn.push(checkVertexNormalize(n, vn));
        }

        face3.normal.x = n[0];
        face3.normal.y = n[1];
        face3.normal.z = n[2];

        face3.vertexNormals.push(new THREE.Vector3(tn[2][0], tn[2][1], tn[2][2]));
        face3.vertexNormals.push(new THREE.Vector3(tn[1][0], tn[1][1], tn[1][2]));
        face3.vertexNormals.push(new THREE.Vector3(tn[0][0], tn[0][1], tn[0][2]));

        // UV
        geometry.faceVertexUvs[0].push([
          new THREE.UV(face.uv[4], face.uv[5]),
          new THREE.UV(face.uv[2], face.uv[3]),
          new THREE.UV(face.uv[0], face.uv[1])
        ]);
      }
      else if (face.vNum == 4) {
        var face4 = new THREE.Face4(vIndex[3], vIndex[2], vIndex[1], vIndex[0], undefined, undefined, face.m[0]);
        geometry.faces.push(face4);

        // 法線
        var n = face.n;
        var tn = []
        for(var j = 0; j < 4; ++j) {
          var vn = mqoMesh.vertNorms[vIndex[j]];
          tn.push(checkVertexNormalize(n, vn));
        }

        face4.normal.x = n[0];
        face4.normal.y = n[1];
        face4.normal.z = n[2];

        face4.vertexNormals.push(new THREE.Vector3(tn[3][0], tn[3][1], tn[3][2]));
        face4.vertexNormals.push(new THREE.Vector3(tn[2][0], tn[2][1], tn[2][2]));
        face4.vertexNormals.push(new THREE.Vector3(tn[1][0], tn[1][1], tn[1][2]));
        face4.vertexNormals.push(new THREE.Vector3(tn[0][0], tn[0][1], tn[0][2]));

        // UV
        geometry.faceVertexUvs[0].push([
          new THREE.UV(face.uv[6], face.uv[7]),
          new THREE.UV(face.uv[4], face.uv[5]),
          new THREE.UV(face.uv[2], face.uv[3]),
          new THREE.UV(face.uv[0], face.uv[1]),
        ]);
      }
    }

    geometry.computeCentroids();

    return new THREE.Mesh(geometry, new THREE.MeshFaceMaterial());
  };
})(this);
