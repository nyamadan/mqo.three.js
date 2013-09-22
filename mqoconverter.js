var MqoConverter = {};

MqoConverter.toTHREEJS_Geometry = function(mqo, options) {
  if(!options) {
    options = {};
  }

  var texturePath = options.texturePath || '.';
  var MaterialConstructor = options.MaterialConstructor || THREE.MeshPhongMaterial;

  //親オブジェクトを格納する
  var geometries = [];

  //mqoを保存
  geometries.parent_mqo = mqo;

  for (var i = 0, len = mqo.meshes.length; i < len; ++i) {
    var object, material;
    var mqoMesh = mqo.meshes[i];
    var geometry = generateGeometry(mqoMesh, mqo.material, texturePath, MaterialConstructor);

    geometry.computeBoundingBox();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    geometries[i] = geometry;
  }
  return geometries;
}

MqoConverter.toTHREEJS_Mesh = function(geometries, options) {
  if(!options) {
    options = {};
  }

  var skins = options.skins || null;
  var rootObject = options.rootObject || new THREE.Object3D 

  var mqo = geometries.parent_mqo;

  //親オブジェクトを格納する
  var parentObjects = [];
  parentObjects[0] = rootObject


  for (var i = 0, len = geometries.length; i < len; ++i) {
    var geometry = geometries[i]
    var mqoMesh = mqo.meshes[i];

    var material
    var object

    if(skins) {
      var skin = skins[i];
      geometry.skinIndices = skin.indices;
      geometry.skinWeights = skin.weights;
      geometry.bones = skin.bones

      for(var j = 0; j < geometry.materials.length; ++j) {
        var gmaterial = geometry.materials[j];
        gmaterial.skinning = true;
      }
    }

    material = new THREE.MeshFaceMaterial(geometry.materials);
    object = new THREE.Mesh(geometry, material);

    //親オブジェクトにオブジェクトを登録する
    parentObjects[mqoMesh.depth].add(object);
    //子オブジェクト保存しておく
    parentObjects[mqoMesh.depth + 1] = object;
  }
  return parentObjects[0];
}

MqoConverter.toTHREEJS = function(mqo, options) {
  if(!options) {
    options = {};
  }

  var geometries = MqoConverter.toTHREEJS_Geometry(mqo, options)
  return MqoConverter.toTHREEJS_Mesh(geometries, options)
}

var generateGeometry = function(mqoMesh, mqoMaterials, texturePath, MaterialConstructor) {
  var geometry = new THREE.Geometry();

  geometry.name = mqoMesh.name

  // マテリアルリスト
  if( geometry.materials == undefined) {
    geometry.materials = []
  }
  for(var i = 0; i < mqoMaterials.materialList.length; ++i) {
    var mqoMaterial = mqoMaterials.materialList[i];
    var material = new MaterialConstructor();
    material.transparent = true;

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
  var scaling = 0.005
  for(var i = 0; i < mqoMesh.vertices.length; ++i) {
    geometry.vertices.push(new THREE.Vector3(
      mqoMesh.vertices[i][0] * scaling,
      mqoMesh.vertices[i][1] * scaling,
      mqoMesh.vertices[i][2] * scaling
    ));
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
        new THREE.Vector2(face.uv[4], 1.0 - face.uv[5]),
        new THREE.Vector2(face.uv[2], 1.0 - face.uv[3]),
        new THREE.Vector2(face.uv[0], 1.0 - face.uv[1])
      ]);
    }
    else if (face.vNum == 4) {
      // 法線
      var n = face.n;
      var tn = []
      for(var j = 0; j < 4; ++j) {
        var vn = mqoMesh.vertNorms[vIndex[j]];
        tn.push(checkVertexNormalize(n, vn));
      }

      var face3 = new THREE.Face3(vIndex[3], vIndex[2], vIndex[1], undefined, undefined, face.m[0]);
      geometry.faces.push(face3);

      face3.normal.x = n[0];
      face3.normal.y = n[1];
      face3.normal.z = n[2];

      face3.vertexNormals.push(new THREE.Vector3(tn[3][0], tn[3][1], tn[3][2]));
      face3.vertexNormals.push(new THREE.Vector3(tn[2][0], tn[2][1], tn[2][2]));
      face3.vertexNormals.push(new THREE.Vector3(tn[1][0], tn[1][1], tn[1][2]));

      // UV
      geometry.faceVertexUvs[0].push([
        new THREE.Vector2(face.uv[6], 1.0 - face.uv[7]),
        new THREE.Vector2(face.uv[4], 1.0 - face.uv[5]),
        new THREE.Vector2(face.uv[2], 1.0 - face.uv[3])
      ]);

      var face3 = new THREE.Face3(vIndex[1], vIndex[0], vIndex[3], undefined, undefined, face.m[0]);
      geometry.faces.push(face3);

      face3.normal.x = n[0];
      face3.normal.y = n[1];
      face3.normal.z = n[2];

      face3.vertexNormals.push(new THREE.Vector3(tn[1][0], tn[1][1], tn[1][2]));
      face3.vertexNormals.push(new THREE.Vector3(tn[0][0], tn[0][1], tn[0][2]));
      face3.vertexNormals.push(new THREE.Vector3(tn[3][0], tn[3][1], tn[3][2]));

      // UV
      geometry.faceVertexUvs[0].push([
        new THREE.Vector2(face.uv[2], 1.0 - face.uv[3]),
        new THREE.Vector2(face.uv[0], 1.0 - face.uv[1]),
        new THREE.Vector2(face.uv[6], 1.0 - face.uv[7]),
      ]);
    }
  }

  geometry.computeCentroids();

  return geometry;
};

if (typeof exports !== 'undefined') {
  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = MqoConverter;
  }
  exports.MqoConverter = MqoConverter;
} else {
  this['MqoConverter'] = MqoConverter;
}
