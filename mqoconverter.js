var MqoConverter = {};

/**
 *
 * @param mqo
 * @param options
 * @returns {Geometry}
 */
MqoConverter.toTHREEJS_Geometry = function(mqo, options) {
  if(!options) {
    options = {};
  }

  var texturePath = options.texturePath || '.';
  var scale = options.scale || 0.01;

  var geometry = new THREE.Geometry()
  mqo.meshes.forEach(function(mqoMesh) {
    THREE.GeometryUtils.merge(geometry, MqoConverter.generateGeometry(mqoMesh, scale))
  })

  geometry.computeCentroids();
  geometry.computeBoundingBox();
  geometry.computeFaceNormals();
  geometry.computeVertexNormals();

  return geometry;
}

/**
 *
 * @param mqoMaterials
 * @param texturePath
 * @returns {Array|*|dojo|NodeList}
 */
MqoConverter.generateMaterials = function(mqoMaterials, texturePath) {
  // マテリアルリスト
  return mqoMaterials.map(function(mqoMaterial) {
    var material = null;
    if(mqoMaterial.shader == 2) {
      material = new THREE.MeshLambertMaterial();
    } else if(mqoMaterial.shader == 3) {
      material = new THREE.MeshPhongMaterial();
    } else  {
      material = new THREE.MeshBasicMaterial();
    }

    if(material.color) {
      material.color.setRGB(
        mqoMaterial.col[0] * mqoMaterial.dif,
        mqoMaterial.col[1] * mqoMaterial.dif,
        mqoMaterial.col[2] * mqoMaterial.dif
      );
    }

    if(material.emissive) {
      material.emissive.setRGB(
        mqoMaterial.col[0] * mqoMaterial.emi,
        mqoMaterial.col[1] * mqoMaterial.emi,
        mqoMaterial.col[2] * mqoMaterial.emi
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

    material.transparent = true;
    material.shiness = mqoMaterial.power;
    material.opacity = mqoMaterial.col[3]

    return material;
  });
}

/**
 *
 * @param mqoMesh
 * @param scale
 * @returns {Geometry}
 */
MqoConverter.generateGeometry = function(mqoMesh, scale) {
  var geometry = new THREE.Geometry();
  for(var i = 0; i < mqoMesh.vertices.length; ++i) {
    geometry.vertices.push(new THREE.Vector3(
      mqoMesh.vertices[i][0] * scale,
      mqoMesh.vertices[i][1] * scale,
      mqoMesh.vertices[i][2] * scale
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

  return geometry;
};

/**
 * 圧縮されたOBJECTを返す
 * @param mqo
 * @param scale
 * @returns {{materials: (THREE.JSONLoader.parse.materials|*|materials|Array|.materials.materials|THREE.MeshFaceMaterial.materials), vertices: (Array|*), faces: (Array|*), uv: (Array|*|dojo|NodeList)}}
 */
MqoConverter.toCompressedObject = function (mqo, scale) {
  var geometry = new THREE.Geometry();
  mqo.meshes.forEach(function (mqoMesh) {
    THREE.GeometryUtils.merge(geometry, MqoConverter.generateGeometry(mqoMesh, scale))
    return
  });

  return {
    materials: mqo.materials,
    vertices: geometry.vertices.map(function (v) {
      return {
        p: [ v.x, v.y, v.z],
        i: [0, 0, 0, 0],
        w: [1, 0, 0, 0]
      }
    }),

    faces: geometry.faces.map(function (face) {
      return {
        a: face.a,
        b: face.b,
        c: face.c,
        m: face.materialIndex,
        n: [ face.normal.x, face.normal.y, face.normal.z]
      }
    }),

    uv: geometry.faceVertexUvs[0].map(function (uv) {
      return [
        [uv[0].x, uv[0].y],
        [uv[1].x, uv[1].y],
        [uv[2].x, uv[2].y]
      ]
    })
  }
};

if (typeof exports !== 'undefined') {
  if (typeof module !== 'undefined' && module.exports) {
    exports = module.exports = MqoConverter;
  }
  exports.MqoConverter = MqoConverter;
} else {
  this['MqoConverter'] = MqoConverter;
}
