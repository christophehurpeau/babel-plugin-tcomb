'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _RESERVED_NAMES;

exports.default = function (_ref) {
  var t = _ref.types,
      template = _ref.template;


  var tcombId = null;
  var assertId = null;
  var extendId = null;
  var hasTypes = false;
  var hasAsserts = false;
  var hasExtend = false;
  var recursiveTypes = [];
  var globals = void 0;

  var assertTemplate = expression('\n    function assertId(x, type, name) {\n      if (warnOnFailure) {\n        tcombId.fail = function (message) { console.warn(message); };\n      }\n      if (tcombId.isType(type) && type.meta.kind !== \'struct\') {\n        if (!type.is(x)) {\n          type(x, [name + \': \' + tcombId.getTypeName(type)]);\n        }\n      } else if (!(x instanceof type)) {\n        tcombId.fail(\'Invalid value \' + tcombId.stringify(x) + \' supplied to \' + name + \' (expected a \' + tcombId.getTypeName(type) + \')\');\n      }\n      return x;\n    }\n  ');

  var extendTemplate = expression('\n    function extendId(types, name) {\n      const isAny = (type) => {\n        if (type === tcombId.Any) {\n          return true;\n        }\n        if (tcombId.isType(type) && type.meta.kind === \'maybe\') {\n          return isAny(type.meta.type)\n        }\n        return false;\n      }\n      return tcombId.interface.extend(types.filter(type => !isAny(type)), name)\n    }\n  ');

  var argumentsTemplate = expression('arguments[index] !== undefined ? arguments[index] : defaults');

  //
  // combinators
  //

  function addTypeName(combinatorArguments, typeName, exact) {
    if (t.isStringLiteral(typeName)) {
      if (exact) {
        combinatorArguments.push(t.objectExpression([t.objectProperty(t.identifier('name'), typeName), t.objectProperty(t.identifier('strict'), t.booleanLiteral(true))]));
      } else {
        combinatorArguments.push(typeName);
      }
    } else if (exact) {
      combinatorArguments.push(t.objectExpression([t.objectProperty(t.identifier('strict'), t.booleanLiteral(true))]));
    }
    return combinatorArguments;
  }

  function callCombinator(combinatorId, combinatorArguments, typeName) {
    return t.callExpression(t.memberExpression(tcombId, combinatorId), addTypeName(combinatorArguments, typeName));
  }

  var listId = t.identifier('list');
  var tupleId = t.identifier('tuple');
  var maybeId = t.identifier('maybe');
  var unionId = t.identifier('union');
  var dictId = t.identifier('dict');
  var refinementId = t.identifier('refinement');
  var interfaceId = t.identifier('interface');
  var declareId = t.identifier('declare');
  var intersectionId = t.identifier('intersection');
  var functionId = t.identifier('Function');
  var objectId = t.identifier('Object');
  var nilId = t.identifier('Nil');
  var numberId = t.identifier('Number');
  var stringId = t.identifier('String');
  var booleanId = t.identifier('Boolean');
  var anyId = t.identifier('Any');
  var promiseId = t.identifier('Promise');
  var VOID_0 = t.unaryExpression("void", t.numericLiteral(0), true);

  function getListCombinator(type, name) {
    return callCombinator(listId, [type], name);
  }

  function getMaybeCombinator(type, name) {
    return callCombinator(maybeId, [type], name);
  }

  function getTupleCombinator(types, name) {
    return callCombinator(tupleId, [t.arrayExpression(types)], name);
  }

  function getUnionCombinator(types, name) {
    return callCombinator(unionId, [t.arrayExpression(types)], name);
  }

  function getEnumsCombinator(enums, name) {
    return t.callExpression(t.memberExpression(t.memberExpression(tcombId, t.identifier('enums')), t.identifier('of')), addTypeName([t.arrayExpression(enums.map(function (e) {
      return t.stringLiteral(e);
    }))], name));
  }

  function getDictCombinator(domain, codomain, name) {
    return callCombinator(dictId, [domain, codomain], name);
  }

  function getRefinementCombinator(type, predicate, name) {
    return callCombinator(refinementId, [type, predicate], name);
  }

  function getInterfaceCombinator(props, name, exact) {
    return t.callExpression(t.memberExpression(tcombId, interfaceId), addTypeName([props], name, exact));
  }

  function getDeclareCombinator(name) {
    return callCombinator(declareId, [name]);
  }

  function getIntersectionCombinator(types, name) {
    var intersections = types.filter(function (t) {
      return !t[REFINEMENT_PREDICATE_ID_STORE_FIELD];
    });
    var refinements = types.filter(function (t) {
      return t[REFINEMENT_PREDICATE_ID_STORE_FIELD];
    });
    var intersection = intersections.length > 1 ? t.callExpression(t.memberExpression(tcombId, intersectionId), addTypeName([t.arrayExpression(intersections)], name)) : intersections[0];
    var len = refinements.length;
    if (len > 0) {
      for (var i = 0; i < len; i++) {
        intersection = getRefinementCombinator(intersection, refinements[i][REFINEMENT_PREDICATE_ID_STORE_FIELD], name);
      }
    }
    return intersection;
  }

  //
  // Flow types
  //

  function getTcombType(id) {
    return t.memberExpression(tcombId, id);
  }

  function getFunctionType() {
    return getTcombType(functionId);
  }

  function getObjectType() {
    return getTcombType(objectId);
  }

  function getNumberType() {
    return getTcombType(numberId);
  }

  function getStringType() {
    return getTcombType(stringId);
  }

  function getBooleanType() {
    return getTcombType(booleanId);
  }

  function getVoidType() {
    return getTcombType(nilId);
  }

  function getNullType() {
    return getTcombType(nilId);
  }

  function getAnyType() {
    return getTcombType(anyId);
  }

  function getPromiseType() {
    return getTcombType(promiseId);
  }

  function getNumericLiteralType(value) {
    var n = t.identifier('n');
    var predicate = t.functionExpression(null, [n], t.blockStatement([t.returnStatement(t.binaryExpression('===', n, t.numericLiteral(value)))]));
    return getRefinementCombinator(getNumberType(), predicate);
  }

  function getBooleanLiteralType(value) {
    var b = t.identifier('b');
    var type = getBooleanType();
    var predicate = t.functionExpression(null, [b], t.blockStatement([t.returnStatement(t.binaryExpression('===', b, t.booleanLiteral(value)))]));
    return getRefinementCombinator(type, predicate);
  }

  //
  // helpers
  //

  function getExpression(node) {
    return t.isExpressionStatement(node) ? node.expression : node;
  }

  function expression(input) {
    var fn = template(input);
    return function (args) {
      var node = fn(args);
      return getExpression(node);
    };
  }

  function getObjectExpression(properties, typeParameters) {
    var props = properties.map(function (prop) {
      var type = getType(prop.value, typeParameters);
      if (prop.optional) {
        type = getMaybeCombinator(type);
      }
      return t.objectProperty(prop.key, type);
    });
    return t.objectExpression(props);
  }

  function getExpressionFromGenericTypeAnnotation(id) {
    if (t.isQualifiedTypeIdentifier(id)) {
      return t.memberExpression(getExpressionFromGenericTypeAnnotation(id.qualification), t.identifier(id.id.name));
    }
    return id;
  }

  function getRefinementPredicateId(annotation) {
    if (annotation.typeParameters.params.length !== 1 || !annotation.typeParameters.params[0].argument) {
      throw new Error('Invalid refinement definition, example: $Refinement<typeof predicate>');
    }
    return getExpressionFromGenericTypeAnnotation(annotation.typeParameters.params[0].argument.id);
  }

  function getTypeParameter(name, typeParameters) {
    return typeParameters && typeParameters.hasOwnProperty(name) ? typeParameters[name] : false;
  }

  function isGlobalType(name) {
    return globals && globals.hasOwnProperty(name);
  }

  function getGenericTypeAnnotation(annotation, typeParameters, typeName) {
    var name = annotation.id.name;
    if (name === 'Array') {
      if (!annotation.typeParameters || annotation.typeParameters.params.length !== 1) {
        throw new Error('Unsupported Array type annotation: incorrect number of type parameters (expected 1)');
      }
      var _typeParameter = annotation.typeParameters.params[0];
      return getListCombinator(getType(_typeParameter, typeParameters), typeName);
    }
    if (name === 'Function') {
      return getFunctionType();
    }
    if (name === 'Object') {
      return getObjectType();
    }
    if (name === '$Exact') {
      return getInterfaceCombinator(getObjectExpression(annotation.typeParameters.params[0].properties, typeParameters), typeName, true);
    }
    if (name === 'Promise') {
      return getPromiseType();
    }

    // this plugin doesn't handle generics by design
    if (isGlobalType(name) || flowMagicTypes.hasOwnProperty(name)) {
      return getAnyType();
    }

    var typeParameter = getTypeParameter(name, typeParameters);
    if (typeParameter) {
      // only bounded polymorphism is supported at the moment
      if (typeParameter.bound) {
        return getType(typeParameter.bound.typeAnnotation, typeParameters);
      }

      return getAnyType();
    }
    var gta = getExpressionFromGenericTypeAnnotation(annotation.id);
    if (name === MAGIC_REFINEMENT_NAME) {
      gta[REFINEMENT_PREDICATE_ID_STORE_FIELD] = getRefinementPredicateId(annotation);
    }
    return gta;
  }

  function getType(annotation, typeParameters, typeName) {
    switch (annotation.type) {

      case 'GenericTypeAnnotation':
        return getGenericTypeAnnotation(annotation, typeParameters, typeName);

      case 'ArrayTypeAnnotation':
        return getListCombinator(getType(annotation.elementType, typeParameters), typeName);

      case 'NullableTypeAnnotation':
        return getMaybeCombinator(getType(annotation.typeAnnotation, typeParameters), typeName);

      case 'TupleTypeAnnotation':
        return getTupleCombinator(annotation.types.map(function (annotation) {
          return getType(annotation, typeParameters);
        }), typeName);

      case 'UnionTypeAnnotation':
        // handle enums
        if (annotation.types.every(function (n) {
          return t.isStringLiteralTypeAnnotation(n);
        })) {
          return getEnumsCombinator(annotation.types.map(function (n) {
            return n.value;
          }), typeName);
        }
        return getUnionCombinator(annotation.types.map(function (annotation) {
          return getType(annotation, typeParameters);
        }), typeName);

      case 'ObjectTypeAnnotation':
        if (annotation.indexers.length === 1) {
          return getDictCombinator(getType(annotation.indexers[0].key, typeParameters), getType(annotation.indexers[0].value, typeParameters), typeName);
        }
        return getInterfaceCombinator(getObjectExpression(annotation.properties, typeParameters), typeName, annotation.exact);

      case 'IntersectionTypeAnnotation':
        return getIntersectionCombinator(annotation.types.map(function (annotation) {
          return getType(annotation, typeParameters);
        }), typeName);

      case 'FunctionTypeAnnotation':
        return getFunctionType();

      case 'NumberTypeAnnotation':
        return getNumberType();

      case 'StringTypeAnnotation':
        return getStringType();

      case 'BooleanTypeAnnotation':
        return getBooleanType();

      case 'VoidTypeAnnotation':
        return getVoidType();

      case 'NullLiteralTypeAnnotation':
        return getNullType();

      case 'TypeofTypeAnnotation':
      case 'AnyTypeAnnotation':
      case 'MixedTypeAnnotation':
      case 'ExistentialTypeParam':
        return getAnyType();

      case 'StringLiteralTypeAnnotation':
        return getEnumsCombinator([annotation.value], typeName);

      case 'NumericLiteralTypeAnnotation':
        return getNumericLiteralType(annotation.value, typeName);

      case 'BooleanLiteralTypeAnnotation':
        return getBooleanLiteralType(annotation.value, typeName);

      default:
        throw new Error('Unsupported type annotation: ' + annotation.type);
    }
  }

  function isSameType(node, annotation) {
    switch (annotation.type) {
      case 'BooleanTypeAnnotation':
        return node.type === 'BooleanLiteral';

      case 'NumberTypeAnnotation':
        return node.type === 'NumericLiteral';

      case 'StringTypeAnnotation':
        return node.type === 'StringLiteral';

      case 'NullLiteralTypeAnnotation':
        return node.type === 'NullLiteral';

      case 'VoidTypeAnnotation':
        return node.type === 'Identifier' && node.name === 'undefined';

      case 'NullableTypeAnnotation':
        return isSameType(node, annotation.typeAnnotation);
    }

    return false;
  }

  function nodeToString(id) {
    return (0, _babelGenerator2.default)(id, { concise: true }).code;
  }

  function getAssertCallExpression(id, annotation, typeParameters, name, optional) {
    if (isSameType(id, annotation)) {
      // no need to check
      return id;
    }

    var type = getType(annotation, typeParameters);
    if (optional) {
      type = getMaybeCombinator(type);
    }
    name = name || t.stringLiteral(nodeToString(id));
    return t.callExpression(assertId, [id, type, name]);
  }

  function getAssert(_ref2, typeParameters) {
    var id = _ref2.id,
        optional = _ref2.optional,
        annotation = _ref2.annotation,
        name = _ref2.name;

    return t.expressionStatement(getAssertCallExpression(id, annotation, typeParameters, name, optional));
  }

  function stripDefaults(node) {
    if (t.isObjectPattern(node)) {
      return t.objectExpression(node.properties.map(function (p) {
        if (t.isRestProperty(p)) {
          return t.objectProperty(p.argument, stripDefaults(p.argument), false, true);
        }
        return t.objectProperty(p.key, stripDefaults(p.value), false, true);
      }));
    } else if (t.isAssignmentPattern(node)) {
      return stripDefaults(node.left);
    }
    return node;
  }

  function getParam(param, i) {
    if (t.isAssignmentPattern(param) && param.left.typeAnnotation) {
      return getParam(param.left, i);
    }
    if (param.typeAnnotation) {
      var isRest = t.isRestElement(param);

      return {
        id: isRest ? param.argument : stripDefaults(param),
        optional: param.optional,
        annotation: param.typeAnnotation.typeAnnotation,
        name: t.stringLiteral(nodeToString(isRest ? param.argument : param))
      };
    }
  }

  function getFunctionArgumentCheckExpressions(node, typeParameters) {
    var params = node.params.map(getParam).filter(Boolean);
    return params.map(function (param) {
      return getAssert(param, typeParameters);
    });
  }

  function getWrappedFunctionReturnWithTypeCheck(isArrow, isAsync, node, typeParameters) {
    var id = void 0;

    if (node.body.body.length === 0) {
      id = VOID_0;
    } else {
      var f = isArrow ? t.arrowFunctionExpression([], t.blockStatement(node.body.body)) : t.functionExpression(null, [], t.blockStatement(node.body.body));

      f[PROCESSED_FUNCTION_STORE_FIELD] = true;

      if (isAsync) {
        f.async = true;
      }

      id = isArrow ? t.callExpression(f, []) : t.callExpression(t.memberExpression(f, t.identifier('apply')), [t.thisExpression(), t.identifier('arguments')]);
    }

    return t.returnStatement(getAssertCallExpression(id, node.returnType.typeAnnotation, typeParameters, t.stringLiteral('return value')));
  }

  function getTypeParameterName(param) {
    if (t.isGenericTypeAnnotation(param)) {
      return param.id.name;
    }
    return param.name;
  }

  function getTypeParameters(node) {
    var typeParameters = {};
    if (node.typeParameters) {
      node.typeParameters.params.forEach(function (param) {
        return typeParameters[getTypeParameterName(param)] = param;
      });
    }
    return typeParameters;
  }

  function getTypeAliasDefinition(path) {
    var node = path.node;
    var typeParameters = getTypeParameters(node);
    var isRecursive = isRecursiveType(node);
    var annotation = node.right;

    if (isRecursive) {
      recursiveTypes.push(t.callExpression(t.memberExpression(node.id, t.identifier('define')), [getType(annotation, typeParameters)]));
      return defineDeclareCombinator(node);
    }

    var typeName = t.stringLiteral(node.id.name);
    return t.variableDeclaration('const', [t.variableDeclarator(node.id, getType(annotation, typeParameters, typeName))]);
  }

  function defineDeclareCombinator(node) {
    return t.variableDeclaration('const', [t.variableDeclarator(node.id, getDeclareCombinator(t.stringLiteral(node.id.name)))]);
  }

  function getInterfaceDefinition(node, typeParameters) {
    var isRecursive = isRecursiveType(node);
    var annotation = node.body;

    if (isRecursive) {
      recursiveTypes.push(t.callExpression(t.memberExpression(node.id, t.identifier('define')), [getType(annotation, typeParameters)]));
      return defineDeclareCombinator(node);
    }

    var typeName = t.stringLiteral(node.id.name);
    return t.variableDeclaration('const', [t.variableDeclarator(node.id, getType(annotation, typeParameters, typeName))]);
  }

  function getExtendedInterfaceDefinition(node, typeParameters) {
    var isRecursive = isRecursiveType(node);
    var mixins = node.extends.filter(function (m) {
      return m.id.name !== MAGIC_REFINEMENT_NAME;
    });
    typeParameters = mixins.reduce(function (acc, node) {
      return assign(acc, getTypeParameters(node));
    }, typeParameters);
    var refinements = node.extends.filter(function (m) {
      return m.id.name === MAGIC_REFINEMENT_NAME;
    });
    var props = getObjectExpression(node.body.properties, typeParameters);
    var len = refinements.length;
    if (len > 0) {
      props = getInterfaceCombinator(props);
      for (var i = 0; i < len; i++) {
        props = getRefinementCombinator(props, getRefinementPredicateId(refinements[i]));
      }
    }

    if (isRecursive) {
      recursiveTypes.push(t.callExpression(t.memberExpression(node.id, t.identifier('define')), [t.callExpression(extendId, [t.arrayExpression(mixins.map(function (inter) {
        return inter.id;
      }).concat(props))])]));
      return defineDeclareCombinator(node);
    }

    var typeName = t.stringLiteral(node.id.name);
    return t.variableDeclaration('const', [t.variableDeclarator(node.id, t.callExpression(extendId, [t.arrayExpression(mixins.map(function (inter) {
      return inter.id;
    }).concat(props)), typeName]))]);
  }

  function buildCodeFrameError(path, error) {
    throw path.buildCodeFrameError('[' + PLUGIN_NAME + '] ' + error.message);
  }

  function preventReservedNamesUsage(path) {
    var name = path.node.id.name;
    if (name in RESERVED_NAMES) {
      buildCodeFrameError(path, new Error(name + ' is a reserved interface name for ' + PLUGIN_NAME));
    }
  }

  function hasRecursiveComment(node) {
    return Array.isArray(node.leadingComments) && node.leadingComments.some(function (comment) {
      return (/recursive/.test(comment.value)
      );
    });
  }

  function isRecursiveType(node) {
    return node[IS_RECURSIVE_STORE_FIELD] || hasRecursiveComment(node);
  }

  function isRuntimeTypeIntrospection(node) {
    return node.typeAnnotation && node.typeAnnotation.typeAnnotation && node.typeAnnotation.typeAnnotation.id && node.typeAnnotation.typeAnnotation.id.name === MAGIC_REIFY_NAME;
  }

  function getRuntimeTypeIntrospection(node) {
    return node.typeAnnotation.typeAnnotation.typeParameters.params[0].id;
  }

  function isTypeExportNamedDeclaration(node) {
    return node.declaration && (t.isTypeAlias(node.declaration) || t.isInterfaceDeclaration(node.declaration));
  }

  function findTypeAnnotationInObjectPattern(name, objectPattern, objectTypeAnnotation) {
    if (!objectTypeAnnotation || !t.isObjectTypeAnnotation(objectTypeAnnotation)) {
      return;
    }

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      var _loop = function _loop() {
        var property = _step.value;

        var typeAnnotation = objectTypeAnnotation.properties.find(function (propType) {
          return propType.key.name === property.key.name;
        });
        if (!typeAnnotation) {
          return 'continue';
        }

        if (t.isIdentifier(property.value) && name === property.value.name) {
          return {
            v: typeAnnotation.value
          };
        } else if (t.isObjectPattern(property.value)) {
          var result = findTypeAnnotationInObjectPattern(name, property.value, typeAnnotation.value);
          if (result) {
            return {
              v: result
            };
          }
        } else if (t.isArrayPattern(property.value)) {
          var _result = findTypeAnnotationInArrayPattern(name, property.value, typeAnnotation.value);
          if (_result) {
            return {
              v: _result
            };
          }
        }
      };

      for (var _iterator = objectPattern.properties[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var _ret = _loop();

        switch (_ret) {
          case 'continue':
            continue;

          default:
            if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        }
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  }

  function findTypeAnnotationInArrayPattern(name, arrayPattern, arrayTypeAnnotation) {
    var isGenericArray = arrayTypeAnnotation && t.isGenericTypeAnnotation(arrayTypeAnnotation) && arrayTypeAnnotation.id.name === 'Array';
    if (!arrayTypeAnnotation || !(t.isTupleTypeAnnotation(arrayTypeAnnotation) || isGenericArray)) {
      return;
    }

    for (var i = 0, element, length = arrayPattern.elements.length; i < length; i++) {
      element = arrayPattern.elements[i];
      var _typeAnnotation = isGenericArray ? arrayTypeAnnotation.typeParameters.params[0] : arrayTypeAnnotation.types[i];
      if (!_typeAnnotation) {
        continue;
      }

      if (t.isIdentifier(element)) {
        return _typeAnnotation;
      } else if (t.isObjectPattern(element)) {
        var result = findTypeAnnotationInObjectPattern(name, element, _typeAnnotation);
        if (result) {
          return result;
        }
      } else if (t.isArrayPattern(element)) {
        var _result2 = findTypeAnnotationInArrayPattern(name, element, _typeAnnotation);
        if (_result2) {
          return _result2;
        }
      }
    }
  }

  //
  // visitors
  //

  return {
    visitor: {

      Program: {
        enter: function enter(path, state) {
          hasAsserts = false;
          hasTypes = false;
          hasExtend = false;
          tcombId = path.scope.generateUidIdentifier('t');
          assertId = path.scope.generateUidIdentifier('assert');
          extendId = path.scope.generateUidIdentifier('extend');
          recursiveTypes = [];
          if (!globals && state.opts.globals) {
            globals = state.opts.globals.reduce(function (acc, x) {
              return assign(acc, x);
            }, {});
          }
        },
        exit: function exit(path, state) {
          var isAssertTemplateRequired = hasAsserts && !state.opts[SKIP_HELPERS_OPTION];
          var isExtendTemplateRequired = hasExtend && !state.opts[SKIP_HELPERS_OPTION];
          var isImportTcombRequired = hasTypes || isAssertTemplateRequired || isExtendTemplateRequired;

          if (isImportTcombRequired) {
            path.node.body.unshift(t.importDeclaration([t.importDefaultSpecifier(tcombId)], t.stringLiteral(TCOMB_LIBRARY)));
          }

          Array.prototype.push.apply(path.node.body, recursiveTypes);

          if (isAssertTemplateRequired) {
            path.node.body.push(assertTemplate({
              warnOnFailure: t.booleanLiteral(!!state.opts[WARN_ON_FAILURE_OPTION]),
              assertId: assertId,
              tcombId: tcombId
            }));
          }

          if (isExtendTemplateRequired) {
            path.node.body.push(extendTemplate({
              extendId: extendId,
              tcombId: tcombId
            }));
          }
        }
      },

      ImportDeclaration: function ImportDeclaration(path) {
        var node = path.node;
        if (node.importKind === 'type') {
          // transform into normal import
          node.importKind = 'value';
        }
        if (node.specifiers) {
          node.specifiers.forEach(function (specifier) {
            if (specifier.importKind === 'type') {
              specifier.importKind = null;
            }
          });
        }
      },
      ExportNamedDeclaration: function ExportNamedDeclaration(path) {
        var node = path.node;
        // prevent transform-flow-strip-types
        if (isTypeExportNamedDeclaration(node)) {
          node.exportKind = 'value';
          node.declaration[IS_RECURSIVE_STORE_FIELD] = isRecursiveType(node);
        }
      },
      TypeAlias: function TypeAlias(path) {
        preventReservedNamesUsage(path);
        hasTypes = true;
        path.replaceWith(getTypeAliasDefinition(path));
      },
      InterfaceDeclaration: function InterfaceDeclaration(path) {
        preventReservedNamesUsage(path);
        hasTypes = true;
        var node = path.node;
        var typeParameters = getTypeParameters(node);
        if (path.node.extends.length > 0) {
          hasExtend = true;
          path.replaceWith(getExtendedInterfaceDefinition(node, typeParameters));
        } else {
          path.replaceWith(getInterfaceDefinition(node, typeParameters));
        }
      },
      TypeCastExpression: function TypeCastExpression(path, state) {
        var node = path.node;
        if (isRuntimeTypeIntrospection(node)) {
          try {
            path.replaceWith(getRuntimeTypeIntrospection(node));
          } catch (error) {
            buildCodeFrameError(path, new Error('Invalid use of ' + MAGIC_REIFY_NAME + ', example: const ReifiedMyType = (({}: any): $Reify<MyType>)'));
          }
        } else {
          if (state.opts[SKIP_ASSERTS_OPTION]) {
            return;
          }
          hasAsserts = true;
          var typeParameters = assign(getTypeParameters(node), node[TYPE_PARAMETERS_STORE_FIELD]);
          path.replaceWith(getAssert({
            id: node.expression,
            annotation: node.typeAnnotation.typeAnnotation
          }, typeParameters));
        }
      },
      Class: function Class(path) {
        // store type parameters so we can read them later
        var node = path.node;
        var typeParameters = getTypeParameters(node);
        path.traverse({
          Function: function Function(_ref3) {
            var node = _ref3.node;

            node[TYPE_PARAMETERS_STORE_FIELD] = assign(typeParameters, node[TYPE_PARAMETERS_STORE_FIELD]);
          }
        });
      },
      VariableDeclaration: function VariableDeclaration(path, state) {
        if (state.opts[SKIP_ASSERTS_OPTION]) {
          return;
        }

        var node = path.node;

        if (node.kind === 'var') return;

        for (var i = 0, len = node.declarations.length; i < len; i++) {
          var declarator = node.declarations[i];
          var id = declarator.id;

          if (!id.typeAnnotation) {
            return;
          }

          id[TYPE_VARIABLE_STORE_FIELD] = id.typeAnnotation;

          if (!declarator.init) {
            return;
          }

          hasAsserts = true;
          declarator.init = getAssertCallExpression(declarator.init, id.typeAnnotation.typeAnnotation, node[TYPE_PARAMETERS_STORE_FIELD], t.stringLiteral(nodeToString(id)));
        }
      },
      AssignmentExpression: function AssignmentExpression(path, state) {
        if (state.opts[SKIP_ASSERTS_OPTION]) {
          return;
        }

        var node = path.node,
            scope = path.scope;


        var typeAnnotation = void 0;
        if (t.isIdentifier(node.left)) {
          var name = node.left.name;
          var binding = scope.getBinding(name);
          if (!binding || binding.path.type !== 'VariableDeclarator') {
            return;
          }

          var declaratorId = binding.path.node.id;
          typeAnnotation = declaratorId[TYPE_VARIABLE_STORE_FIELD];

          if (!typeAnnotation || !typeAnnotation.typeAnnotation) {
            return;
          }

          typeAnnotation = typeAnnotation.typeAnnotation;

          if (t.isObjectPattern(declaratorId)) {
            typeAnnotation = findTypeAnnotationInObjectPattern(name, declaratorId, typeAnnotation);
          } else if (t.isArrayPattern(declaratorId)) {
            typeAnnotation = findTypeAnnotationInArrayPattern(name, declaratorId, typeAnnotation);
          }
        }

        if (!typeAnnotation || typeAnnotation.type === 'AnyTypeAnnotation') {
          return;
        }

        hasAsserts = true;
        node.right = getAssertCallExpression(node.right, typeAnnotation, node[TYPE_PARAMETERS_STORE_FIELD], t.stringLiteral(node.left.name || (0, _babelGenerator2.default)(node.left, { concise: true }).code));
      },
      Function: function Function(path, state) {
        var node = path.node;
        if (state.opts[SKIP_ASSERTS_OPTION] || node[PROCESSED_FUNCTION_STORE_FIELD]) {
          return;
        }
        node[PROCESSED_FUNCTION_STORE_FIELD] = true;

        var typeParameters = assign(getTypeParameters(node), node[TYPE_PARAMETERS_STORE_FIELD]);

        // store type parameters so we can read them later
        path.traverse({
          'Function|VariableDeclaration|TypeCastExpression': function FunctionVariableDeclarationTypeCastExpression(_ref4) {
            var node = _ref4.node;

            node[TYPE_PARAMETERS_STORE_FIELD] = assign(typeParameters, node[TYPE_PARAMETERS_STORE_FIELD]);
          }
        });

        try {
          var argumentChecks = getFunctionArgumentCheckExpressions(node, typeParameters);

          if (node.returnType || argumentChecks.length !== 0) {
            var isArrow = false;
            // Firstly let's replace arrow function
            if (t.isArrowFunctionExpression(node)) {
              isArrow = true;
              /* if (argumentChecks.length !== 0) {
                // replace into normal function with right this
                node.type = "FunctionExpression"
                path.ensureBlock()
                path.replaceWith(t.callExpression(
                  t.memberExpression(node, t.identifier("bind")),
                  [t.thisExpression()]
                ))
              } else */if (node.expression) {
                // replace into block statement return structures
                node.expression = false;
                node.body = t.blockStatement([t.returnStatement(node.body)]);
              }
            }

            // If we have a return type then we will wrap our entire function
            // body and insert a type check on the returned value.
            if (node.returnType) {
              hasAsserts = true;
              node.body.body = [].concat(_toConsumableArray(argumentChecks), [getWrappedFunctionReturnWithTypeCheck(isArrow, node.async, node, typeParameters)]);
              if (node.async) {
                node.async = false;
              }
            } else if (argumentChecks.length > 0) {
              var _node$body$body;

              // Prepend any argument checks to the top of our function body.
              hasAsserts = true;
              (_node$body$body = node.body.body).unshift.apply(_node$body$body, _toConsumableArray(argumentChecks));
            }
          }
        } catch (error) {
          buildCodeFrameError(path, error);
        }
      }
    }
  };
};

var _babelGenerator = require('babel-generator');

var _babelGenerator2 = _interopRequireDefault(_babelGenerator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; } /*! @preserve
                                                                                                                                                                                                                   *
                                                                                                                                                                                                                   * babel-plugin-tcomb - Babel plugin for static and runtime type checking using Flow and tcomb
                                                                                                                                                                                                                   *
                                                                                                                                                                                                                   * The MIT License (MIT)
                                                                                                                                                                                                                   *
                                                                                                                                                                                                                   * Copyright (c) 2016 Giulio Canti
                                                                                                                                                                                                                   *
                                                                                                                                                                                                                   */

var TCOMB_LIBRARY = 'tcomb-forked';
var PLUGIN_NAME = 'babel-plugin-tcomb';
var TYPE_PARAMETERS_STORE_FIELD = '__babel_plugin_tcomb_typeParametersStoreField';
var TYPE_VARIABLE_STORE_FIELD = '__babel_plugin_tcomb_typeVariableStoreField';
var IS_RECURSIVE_STORE_FIELD = '__babel_plugin_tcomb_isRecursiveStoreField';
var REFINEMENT_PREDICATE_ID_STORE_FIELD = '__babel_plugin_tcomb_refinementPredicateIdStoreField';
var PROCESSED_FUNCTION_STORE_FIELD = '__babel_plugin_tcomb_ProcessedFunctionField';

var flowMagicTypes = {
  '$Shape': true,
  '$Keys': true,
  '$Diff': true,
  '$Abstract': true,
  '$Subtype': true,
  '$ObjMap': true
};

// plugin magic types
var MAGIC_REFINEMENT_NAME = '$Refinement';
var MAGIC_REIFY_NAME = '$Reify';
var RESERVED_NAMES = (_RESERVED_NAMES = {}, _defineProperty(_RESERVED_NAMES, MAGIC_REFINEMENT_NAME, true), _defineProperty(_RESERVED_NAMES, MAGIC_REIFY_NAME, true), _RESERVED_NAMES);

// plugin config

// useful for tests
var SKIP_HELPERS_OPTION = 'skipHelpers';
// useful for keeping the models
var SKIP_ASSERTS_OPTION = 'skipAsserts';
var WARN_ON_FAILURE_OPTION = 'warnOnFailure';

function assign(x, y) {
  if (y) {
    for (var k in y) {
      x[k] = y[k];
    }
  }
  return x;
}