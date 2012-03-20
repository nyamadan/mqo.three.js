(function(global) {
    /*
      デフォルト引数をセット
    */
    var getArgs = function(args, defaultArgs) {
      var _args = {};
      var key;

      for(key in defaultArgs) {
        _args[key] = defaultArgs[key]
      }

      for(key in args) {
        _args[key] = args[key];
      }

      return _args;
    };

    /**
     * メタセコローダ
     */
    var MqoLoader = {
        /**
         * url からロード
         */
        load: function(args) {
            args = getArgs(args, {
              url : null
              , texturePath : '.'
              , MaterialConstructor : THREE.MeshPhongMaterial
              , callback : null
            });

            var self = this;
            var req = new XMLHttpRequest();
            req.open('GET', args.url, true);
            req.onload = function() {
                self.loadFromData({
                  texturePath : args.texturePath
                  , MaterialConstructor : args.MaterialConstructor
                  , callback : args.callback
                  , data : req.responseText
                });
            };
            req.send(null);
        },

        /**
         * データからロード
         */
        loadFromData: function(args) {
            args = getArgs(args, {
              texturePath : '.'
              , MaterialConstructor : THREE.MeshPhongMaterial
              , callback : null
              , data : null
            });

            var mqoModel = new MqoModel();
            model = null;

            mqoModel.parse(args.data);
            model = mqoModel.convert(args.texturePath, args.MaterialConstructor);

            args.callback(model);

            return MqoModel;
        }

    };

    /**
     * メタセコモデル
     */
    var MqoModel = function()
    {
        this.meshes = Array();
        this.material = null;
    };

    MqoModel.prototype = {
        /**
         * パース
         */
        parse: function(text) {
            // オブジェクトをパース
            var objectTextList = text.match(/^Object [\s\S]*?^\}/gm);

            for (var i = 0, len = objectTextList.length; i < len; ++i) {
                var objectText = objectTextList[i];
                var mesh = new MqoMesh();
                mesh.parse(objectText);
                this.meshes.push(mesh);
            }

            // マテリアル
            var materialText = text.match(/^Material [\s\S]*?^\}/m);

            this.material = new MqoMaterial();
            if (materialText) {
                this.material.parse(materialText[0]);
            }
        },

        /**
         * コンバート
         */
        convert: function(texturePath, MaterialConstructor) {
            var meshes = [];
            for (var i = 0, len = this.meshes.length; i < len; ++i) {
                meshes.push(this.meshes[i].convert(this.material, texturePath, MaterialConstructor));
            }

            return meshes;
        }
    };

    /**
     * メタセコメッシュ
     */
    var MqoMesh = function() {
        this.vertices = [];   // 頂点
        this.faces = [];   // 面情報
        this.vertNorms = [];   // 頂点法線

        this.facet = 59.5;     // スムージング角度
        this.mirror = 0;
        this.mirrorAxis = 0;
    };

    MqoMesh.prototype = {
        /**
         * パース
         */
        parse: function(text) {
            // スムージング角
            var facet = text.match(/facet ([0-9\.]+)/);
            if (facet) { this.facet = Number(facet[1]); }

            // ミラー
            var mirror = text.match(/mirror ([0-9])/m);
            if (mirror) {
                this.mirror = Number(mirror[1]);
                // 軸
                var mirrorAxis = text.match(/mirror_axis ([0-9])/m);
                if (mirrorAxis) {
                    this.mirrorAxis = Number(mirrorAxis[1]);
                }
            }

            var vertex_txt = text.match(/vertex ([0-9]+).+\{\s([\w\W]+)}$/gm);
            this._parseVertices(RegExp.$1, RegExp.$2);

            var face_txt = text.match(/face ([0-9]+).+\{\s([\w\W]+)}$/gm);
            this._parseFaces(RegExp.$1, RegExp.$2);
        },

        /**
         * コンバート
         */
        convert: function(materials, texturePath, MaterialConstructor) {
            var geometry = new THREE.Geometry();

            // マテリアルリスト
            for(var i = 0; i < materials.materialList.length; ++i) {
              var mqoMaterial = materials.materialList[i];
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
            for(var i = 0; i < this.vertices.length; ++i) {
              geometry.vertices.push(new THREE.Vertex(new THREE.Vector3(
                this.vertices[i][0],
                this.vertices[i][1],
                this.vertices[i][2]
              )));
            }

            // チェック
            var smoothingValue = Math.cos(this.facet * Math.PI / 180);
            var checkVertexNormalize = function(n, vn)
            {
                var c = n[0] * vn[0] + n[1] * vn[1] + n[2] * vn[2];
                return (c > smoothingValue) ? vn : n;
            };

            // indices と uv を作成
            for (var i = 0; i < this.faces.length; ++i) {
                var face = this.faces[i];
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
                      var vn = this.vertNorms[vIndex[j]];
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
                      var vn = this.vertNorms[vIndex[j]];
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

            var material = new THREE.MeshFaceMaterial( );
            var mesh = new THREE.Mesh(geometry, material);

            return mesh;
        },

        _parseVertices: function(num, text) {
            var vertexTextList = text.split('\n');
            var scaling = 0.01;
            for (var i = 1; i <= num; ++i) {
                var vertex = vertexTextList[i].split(' ');
                vertex[0] = Number(vertex[0]) * scaling;
                vertex[1] = Number(vertex[1]) * scaling;
                vertex[2] = Number(vertex[2]) * scaling;
                this.vertices.push(vertex);
            }

            if (this.mirror) {
                var self = this;
                var toMirror = (function() {
                    return {
                        1: function(v) { return [v[0] * -1, v[1], v[2]]; },
                        2: function(v) { return [v[0], v[1] * -1, v[2]]; },
                        4: function(v) { return [v[0], v[1], v[2] * -1]; }
                    }[self.mirrorAxis];
                })();

                var len = this.vertices.length;
                for (var i = 0; i < len; ++i) {
                    this.vertices.push(
                        toMirror(this.vertices[i])
                    );
                }
            }
        },

        _parseFaces: function(num, text) {
            var faceTextList = text.split('\n');

            var calcNormalize = function(a, b, c)
            {
                var v1 = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
                var v2 = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];

                var v3 = [
                    v1[1] * v2[2] - v1[2] * v2[1],
                    v1[2] * v2[0] - v1[0] * v2[2],
                    v1[0] * v2[1] - v1[1] * v2[0]
                ];
                var len = Math.sqrt(v3[0] * v3[0] + v3[1] * v3[1] + v3[2] * v3[2]);
                v3[0] /= len;
                v3[1] /= len;
                v3[2] /= len;

                return v3;
            };

            for (var i = 1; i <= num; ++i) {
                // トリムっとく
                var faceText = faceTextList[i].replace(/^\s+|\s+$/g, '');
                // 面の数
                var vertex_num = Number(faceText[0]);

                var info = faceText.match(/([A-Za-z]+)\(([\w\s\-\.\(\)]+?)\)/gi);
                var face = { vNum: vertex_num };

                for (var j = 0, len = info.length; j < len; ++j) {
                    var m = info[j].match(/([A-Za-z]+)\(([\w\s\-\.\(\)]+?)\)/);
                    var key = m[1].toLowerCase();
                    var value = m[2].split(' ');
                    value.forEach(function(elm, i, arr) {
                        arr[i] = Number(elm);
                    });
                    face[key] = value;
                }

                // UV デフォルト値
                if (!face.uv) {
                    face.uv = [0, 0, 0, 0, 0, 0, 0, 0];
                }

                // マテリアル デフォルト値
                if (!face.m) face.m = [undefined];

                // 法線
                face.n = calcNormalize(this.vertices[face.v[0]], this.vertices[face.v[1]], this.vertices[face.v[2]]);

                this.faces.push(face);
            }


            // ミラー対応
            if (this.mirror) {
                var swap = function(a, b) { var temp = this[a]; this[a] = this[b]; this[b] = temp; return this; };
                var len = this.faces.length;
                var vertexOffset = (this.vertices.length / 2);
                for (var i = 0; i < len; ++i) {
                    var targetFace = this.faces[i];
                    var face = {
                        uv: [],
                        v: [],
                        vNum: targetFace.vNum
                    };
                    for (var j = 0; j < targetFace.v.length; ++j) { face.v[j] = targetFace.v[j] + vertexOffset; }
                    for (var j = 0; j < targetFace.uv.length; ++j) { face.uv[j] = targetFace.uv[j]; }

                    if (face.vNum == 3) {
                        swap.call(face.v, 1, 2);
                    }
                    else {
                        swap.call(face.v, 0, 1);
                        swap.call(face.v, 2, 3);
                    }

                    face.n = targetFace.n;
                    face.m = targetFace.m;

                    this.faces.push(face);
                }
            }

            // 頂点法線を求める
            var vertNorm = Array(this.vertices.length);
            for (var i = 0, len = this.vertices.length; i < len; ++i) vertNorm[i] = [];

            for (var i = 0; i < this.faces.length; ++i) {
                var face = this.faces[i];
                var vIndices = face.v;

                for (var j = 0; j < face.vNum; ++j) {
                    var index = vIndices[j];
                    vertNorm[index].push.apply(vertNorm[index], face.n);
                }
            }

            for (var i = 0; i < vertNorm.length; ++i) {
                var vn = vertNorm[i];
                var result = [0, 0, 0];
                var len = vn.length / 3;0
                for (var j = 0; j < len; ++j) {
                    result[0] += vn[j * 3 + 0];
                    result[1] += vn[j * 3 + 1];
                    result[2] += vn[j * 3 + 2];
                }

                result[0] /= len;
                result[1] /= len;
                result[2] /= len;

                var len = Math.sqrt(result[0] * result[0] + result[1] * result[1] + result[2] * result[2]);
                result[0] /= len;
                result[1] /= len;
                result[2] /= len;

                this.vertNorms[i] = result;
            }
        }
    };

    /**
     * メタセコ用マテリアル
     */
    var MqoMaterial = function() {
        this.materialList = [];

        // デフォルト
        this.materialList[undefined] = {
            col: [1, 1, 1, 1]
        };
    };

    MqoMaterial.prototype = {
        /**
         * パース
         */
        parse: function(text) {
            var infoText = text.match(/^Material [0-9]* \{\r\n([\s\S]*?)\n^\}$/m);
            var matTextList = infoText[1].split('\n');

            for (var i = 0, len = matTextList.length; i < len; ++i) {
                var mat = {};
                // トリムっとく
                var matText = matTextList[i].replace(/^\s+|\s+$/g, '');
                var info = matText.match(/([A-Za-z]+)\(([\w\W]+?)\)/gi);

                for (var j = 0, len2 = info.length; j < len2; ++j) {
                    var m = info[j].match(/([A-Za-z]+)\(([\w\W]+?)\)/);
                    var key = m[1].toLowerCase();
                    var value = null;

                    if (key != 'tex') {
                        value = m[2].split(' ');
                        value.forEach(function(elm, i, arr) {
                            arr[i] = Number(elm);
                        });
                    }
                    else {
                        value = m[2].replace(/"/g, '');
                    }
                    mat[key] = value;
                }

                this.materialList.push(mat);
            }
        }
    };

    global.MqoLoader = MqoLoader;

})(this);

