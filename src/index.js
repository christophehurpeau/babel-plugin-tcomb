/*! @preserve
 *
 * babel-plugin-tcomb - Babel plugin for static and runtime type checking using Flow and tcomb
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2016 Giulio Canti
 *
 */

import generate from 'babel-generator'

const TCOMB_LIBRARY = 'tcomb-forked'
const PLUGIN_NAME = 'babel-plugin-tcomb'
const TYPE_PARAMETERS_STORE_FIELD = '__babel_plugin_tcomb_typeParametersStoreField'
const TYPE_VARIABLE_STORE_FIELD = '__babel_plugin_tcomb_typeVariableStoreField'
const IS_RECURSIVE_STORE_FIELD = '__babel_plugin_tcomb_isRecursiveStoreField'
const REFINEMENT_PREDICATE_ID_STORE_FIELD = '__babel_plugin_tcomb_refinementPredicateIdStoreField'
const PROCESSED_FUNCTION_STORE_FIELD = '__babel_plugin_tcomb_ProcessedFunctionField'

const flowMagicTypes = {
  '$Shape': true,
  '$Keys': true,
  '$Diff': true,
  '$Abstract': true,
  '$Subtype': true,
  '$ObjMap': true
}

// plugin magic types
const MAGIC_REFINEMENT_NAME = '$Refinement'
const MAGIC_REIFY_NAME = '$Reify'
const RESERVED_NAMES = {
  [MAGIC_REFINEMENT_NAME]: true,
  [MAGIC_REIFY_NAME]: true
}

// plugin config

// useful for tests
const SKIP_HELPERS_OPTION = 'skipHelpers'
// useful for keeping the models
const SKIP_ASSERTS_OPTION = 'skipAsserts'
const WARN_ON_FAILURE_OPTION = 'warnOnFailure'

function assign(x, y) {
  if (y) {
    for (let k in y) {
      x[k] = y[k]
    }
  }
  return x
}

export default function ({ types: t, template }) {

  let tcombId = null
  let assertId = null
  let extendId = null
  let hasTypes = false
  let hasAsserts = false
  let hasExtend = false
  let recursiveTypes = []
  let globals

  const assertTemplate = expression(`
    function assertId(x, type, name) {
      if (warnOnFailure) {
        tcombId.fail = function (message) { console.warn(message); };
      }
      if (tcombId.isType(type) && type.meta.kind !== 'struct') {
        if (!type.is(x)) {
          type(x, [name + ': ' + tcombId.getTypeName(type)]);
        }
      } else if (!(x instanceof type)) {
        tcombId.fail('Invalid value ' + tcombId.stringify(x) + ' supplied to ' + name + ' (expected a ' + tcombId.getTypeName(type) + ')');
      }
      return x;
    }
  `)

  const extendTemplate = expression(`
    function extendId(types, name) {
      const isAny = (type) => {
        if (type === tcombId.Any) {
          return true;
        }
        if (tcombId.isType(type) && type.meta.kind === 'maybe') {
          return isAny(type.meta.type)
        }
        return false;
      }
      return tcombId.interface.extend(types.filter(type => !isAny(type)), name)
    }
  `)

  const argumentsTemplate = expression(`arguments[index] !== undefined ? arguments[index] : defaults`)

  //
  // combinators
  //

  function addTypeName(combinatorArguments, typeName, exact) {
    if (t.isStringLiteral(typeName)) {
      if (exact) {
        combinatorArguments.push(t.objectExpression([
          t.objectProperty(t.identifier('name'), typeName),
          t.objectProperty(t.identifier('strict'), t.booleanLiteral(true))
        ]))
      }
      else {
        combinatorArguments.push(typeName)
      }
    }
    else if (exact) {
      combinatorArguments.push(t.objectExpression([
        t.objectProperty(t.identifier('strict'), t.booleanLiteral(true))
      ]))
    }
    return combinatorArguments
  }

  function callCombinator(combinatorId, combinatorArguments, typeName) {
    return t.callExpression(
      t.memberExpression(tcombId, combinatorId),
      addTypeName(combinatorArguments, typeName)
    )
  }

  const listId = t.identifier('list')
  const tupleId = t.identifier('tuple')
  const maybeId = t.identifier('maybe')
  const unionId = t.identifier('union')
  const dictId = t.identifier('dict')
  const refinementId = t.identifier('refinement')
  const interfaceId = t.identifier('interface')
  const declareId = t.identifier('declare')
  const intersectionId = t.identifier('intersection')
  const functionId = t.identifier('Function')
  const objectId = t.identifier('Object')
  const nilId = t.identifier('Nil')
  const numberId = t.identifier('Number')
  const stringId = t.identifier('String')
  const booleanId = t.identifier('Boolean')
  const anyId = t.identifier('Any')
  const promiseId = t.identifier('Promise')
  const VOID_0 = t.unaryExpression("void", t.numericLiteral(0), true)

  function getListCombinator(type, name) {
    return callCombinator(listId, [type], name)
  }

  function getMaybeCombinator(type, name) {
    return callCombinator(maybeId, [type], name)
  }

  function getTupleCombinator(types, name) {
    return callCombinator(tupleId, [t.arrayExpression(types)], name)
  }

  function getUnionCombinator(types, name) {
    return callCombinator(unionId, [t.arrayExpression(types)], name)
  }

  function getEnumsCombinator(enums, name) {
    return t.callExpression(
      t.memberExpression(t.memberExpression(tcombId, t.identifier('enums')), t.identifier('of')),
      addTypeName([t.arrayExpression(enums.map(e => t.stringLiteral(e)))], name)
    )
  }

  function getDictCombinator(domain, codomain, name) {
    return callCombinator(dictId, [domain, codomain], name)
  }

  function getRefinementCombinator(type, predicate, name) {
    return callCombinator(refinementId, [type, predicate], name)
  }

  function getInterfaceCombinator(props, name, exact) {
    return t.callExpression(
      t.memberExpression(tcombId, interfaceId),
      addTypeName([props], name, exact)
    )
  }

  function getDeclareCombinator(name) {
    return callCombinator(declareId, [name])
  }

  function getIntersectionCombinator(types, name) {
    const intersections = types.filter(t => !(t[REFINEMENT_PREDICATE_ID_STORE_FIELD]))
    const refinements = types.filter(t => t[REFINEMENT_PREDICATE_ID_STORE_FIELD])
    let intersection = intersections.length > 1 ?
      t.callExpression(
        t.memberExpression(tcombId, intersectionId),
        addTypeName([t.arrayExpression(intersections)], name)
      ) :
      intersections[0]
    const len = refinements.length
    if (len > 0) {
      for (let i = 0; i < len; i++) {
        intersection = getRefinementCombinator(intersection, refinements[i][REFINEMENT_PREDICATE_ID_STORE_FIELD], name)
      }
    }
    return intersection
  }

  //
  // Flow types
  //

  function getTcombType(id) {
    return t.memberExpression(tcombId, id)
  }

  function getFunctionType() {
    return getTcombType(functionId)
  }

  function getObjectType() {
    return getTcombType(objectId)
  }

  function getNumberType() {
    return getTcombType(numberId)
  }

  function getStringType() {
    return getTcombType(stringId)
  }

  function getBooleanType() {
    return getTcombType(booleanId)
  }

  function getVoidType() {
    return getTcombType(nilId)
  }

  function getNullType() {
    return getTcombType(nilId)
  }

  function getAnyType() {
    return getTcombType(anyId)
  }

  function getPromiseType() {
    return getTcombType(promiseId)
  }

  function getNumericLiteralType(value) {
    const n = t.identifier('n')
    const predicate = t.functionExpression(null, [n], t.blockStatement([
      t.returnStatement(
        t.binaryExpression(
          '===',
          n,
          t.numericLiteral(value)
        )
      )
    ]))
    return getRefinementCombinator(getNumberType(), predicate)
  }

  function getBooleanLiteralType(value) {
    const b = t.identifier('b')
    const type = getBooleanType()
    const predicate = t.functionExpression(null, [b], t.blockStatement([
      t.returnStatement(
        t.binaryExpression(
          '===',
          b,
          t.booleanLiteral(value)
        )
      )
    ]))
    return getRefinementCombinator(type, predicate)
  }

  //
  // helpers
  //

  function getExpression(node) {
    return t.isExpressionStatement(node) ? node.expression : node
  }

  function expression(input) {
    const fn = template(input)
    return function (args) {
      const node = fn(args)
      return getExpression(node)
    }
  }

  function getObjectExpression(properties, typeParameters) {
    const props = properties
      .map(prop => {
        let type = getType(prop.value, typeParameters)
        if (prop.optional) {
          type = getMaybeCombinator(type)
        }
        return t.objectProperty(prop.key, type)
      })
    return t.objectExpression(props)
  }

  function getExpressionFromGenericTypeAnnotation(id) {
    if (t.isQualifiedTypeIdentifier(id)) {
      return t.memberExpression(getExpressionFromGenericTypeAnnotation(id.qualification), t.identifier(id.id.name))
    }
    return id
  }

  function getRefinementPredicateId(annotation) {
    if (annotation.typeParameters.params.length !== 1 || !annotation.typeParameters.params[0].argument) {
      throw new Error(`Invalid refinement definition, example: $Refinement<typeof predicate>`)
    }
    return getExpressionFromGenericTypeAnnotation(annotation.typeParameters.params[0].argument.id)
  }

  function getTypeParameter(name, typeParameters) {
    return typeParameters && typeParameters.hasOwnProperty(name) ? typeParameters[name] : false
  }

  function isGlobalType(name) {
    return globals && globals.hasOwnProperty(name)
  }

  function getGenericTypeAnnotation(annotation, typeParameters, typeName) {
    const name = annotation.id.name
    if (name === 'Array') {
      if (!annotation.typeParameters || annotation.typeParameters.params.length !== 1) {
        throw new Error(`Unsupported Array type annotation: incorrect number of type parameters (expected 1)`)
      }
      const typeParameter = annotation.typeParameters.params[0]
      return getListCombinator(getType(typeParameter, typeParameters), typeName)
    }
    if (name === 'Function') {
      return getFunctionType()
    }
    if (name === 'Object') {
      return getObjectType()
    }
    if (name === '$Exact') {
      return getInterfaceCombinator(getObjectExpression(annotation.typeParameters.params[0].properties, typeParameters), typeName, true)
    }
    if (name === 'Promise') {
      return getPromiseType()
    }

    // this plugin doesn't handle generics by design
    if (isGlobalType(name) || flowMagicTypes.hasOwnProperty(name)) {
      return getAnyType()
    }

    const typeParameter = getTypeParameter(name, typeParameters)
    if (typeParameter) {
      // only bounded polymorphism is supported at the moment
      if (typeParameter.bound) {
        return getType(typeParameter.bound.typeAnnotation, typeParameters)
      }

      return getAnyType()
    }
    const gta = getExpressionFromGenericTypeAnnotation(annotation.id)
    if (name === MAGIC_REFINEMENT_NAME) {
      gta[REFINEMENT_PREDICATE_ID_STORE_FIELD] = getRefinementPredicateId(annotation)
    }
    return gta
  }

  function getType(annotation, typeParameters, typeName) {
    switch (annotation.type) {

      case 'GenericTypeAnnotation' :
        return getGenericTypeAnnotation(annotation, typeParameters, typeName)

      case 'ArrayTypeAnnotation' :
        return getListCombinator(getType(annotation.elementType, typeParameters), typeName)

      case 'NullableTypeAnnotation' :
        return getMaybeCombinator(getType(annotation.typeAnnotation, typeParameters), typeName)

      case 'TupleTypeAnnotation' :
        return getTupleCombinator(annotation.types.map(annotation => getType(annotation, typeParameters)), typeName)

      case 'UnionTypeAnnotation' :
        // handle enums
        if (annotation.types.every(n => t.isStringLiteralTypeAnnotation(n))) {
          return getEnumsCombinator(annotation.types.map(n => n.value), typeName)
        }
        return getUnionCombinator(annotation.types.map(annotation => getType(annotation, typeParameters)), typeName)

      case 'ObjectTypeAnnotation' :
        if (annotation.indexers.length === 1) {
          return getDictCombinator(
            getType(annotation.indexers[0].key, typeParameters),
            getType(annotation.indexers[0].value, typeParameters),
            typeName
          )
        }
        return getInterfaceCombinator(getObjectExpression(annotation.properties, typeParameters), typeName, annotation.exact)

      case 'IntersectionTypeAnnotation' :
        return getIntersectionCombinator(annotation.types.map(annotation => getType(annotation, typeParameters)), typeName)

      case 'FunctionTypeAnnotation' :
        return getFunctionType()

      case 'NumberTypeAnnotation' :
        return getNumberType()

      case 'StringTypeAnnotation' :
        return getStringType()

      case 'BooleanTypeAnnotation' :
        return getBooleanType()

      case 'VoidTypeAnnotation' :
        return getVoidType()

      case 'NullLiteralTypeAnnotation' :
        return getNullType()

      case 'TypeofTypeAnnotation' :
      case 'AnyTypeAnnotation' :
      case 'MixedTypeAnnotation' :
      case 'ExistentialTypeParam' :
        return getAnyType()

      case 'StringLiteralTypeAnnotation' :
        return getEnumsCombinator([annotation.value], typeName)

      case 'NumericLiteralTypeAnnotation' :
        return getNumericLiteralType(annotation.value, typeName)

      case 'BooleanLiteralTypeAnnotation' :
        return getBooleanLiteralType(annotation.value, typeName)

      default :
        throw new Error(`Unsupported type annotation: ${annotation.type}`)
    }
  }

  function isSameType(node, annotation) {
    switch (annotation.type) {
      case 'BooleanTypeAnnotation':
        return node.type === 'BooleanLiteral'

      case 'NumberTypeAnnotation':
        return node.type === 'NumericLiteral'

      case 'StringTypeAnnotation':
        return node.type === 'StringLiteral'

      case 'NullLiteralTypeAnnotation':
        return node.type === 'NullLiteral'

      case 'VoidTypeAnnotation':
        return node.type === 'Identifier' && node.name === 'undefined'

      case 'NullableTypeAnnotation':
        return isSameType(node, annotation.typeAnnotation)
    }

    return false
  }

  function nodeToString(id) {
    return generate(id, { concise: true }).code
  }

  function getAssertCallExpression(id, annotation, typeParameters, name, optional) {
    if (isSameType(id, annotation)) {
      // no need to check
      return id
    }

    let type = getType(annotation, typeParameters)
    if (optional) {
      type = getMaybeCombinator(type)
    }
    name = name || t.stringLiteral(nodeToString(id))
    return t.callExpression(
      assertId,
      [id, type, name]
    )
  }

  function getAssert({ id, optional, annotation, name }, typeParameters) {
    return t.expressionStatement(getAssertCallExpression(id, annotation, typeParameters, name, optional))
  }

  function stripDefaults(node) {
    if (t.isObjectPattern(node)) {
      return t.objectExpression(node.properties.map(p => {
        if (t.isRestProperty(p)) {
          return t.objectProperty(p.argument, stripDefaults(p.argument), false, true)
        }
        return t.objectProperty(p.key, stripDefaults(p.value), false, true)
      }))
    }
    else if (t.isAssignmentPattern(node)) {
      return stripDefaults(node.left)
    }
    return node
  }

  function getParam(param, i) {
    if (t.isAssignmentPattern(param) && param.left.typeAnnotation) {
      return getParam(param.left, i)
    }
    if (param.typeAnnotation) {
      const isRest = t.isRestElement(param)

      return {
        id: isRest ? param.argument : stripDefaults(param),
        optional: param.optional,
        annotation: param.typeAnnotation.typeAnnotation,
        name: t.stringLiteral(nodeToString(isRest ? param.argument : param))
      }
    }
  }

  function getFunctionArgumentCheckExpressions(node, typeParameters) {
    const params = node.params.map(getParam).filter(Boolean)
    return params.map(param => getAssert(param, typeParameters))
  }

  function getWrappedFunctionReturnWithTypeCheck(isArrow, isAsync, node, typeParameters) {
    let id

    if (node.body.body.length === 0) {
      id = VOID_0
    } else {
      const f = isArrow ? t.arrowFunctionExpression([], t.blockStatement(node.body.body))
        : t.functionExpression(null, [], t.blockStatement(node.body.body))

      f[PROCESSED_FUNCTION_STORE_FIELD] = true

      if (isAsync) {
          f.async = true
      }

      id = isArrow ? t.callExpression(f, []) : t.callExpression(
        t.memberExpression(f, t.identifier('apply')),
        [t.thisExpression(), t.identifier('arguments')]
      )
    }

    return t.returnStatement(getAssertCallExpression(
      id,
      node.returnType.typeAnnotation,
      typeParameters,
      t.stringLiteral('return value')
    ))
  }

  function getTypeParameterName(param) {
    if (t.isGenericTypeAnnotation(param)) {
      return param.id.name
    }
    return param.name
  }

  function getTypeParameters(node) {
    const typeParameters = {}
    if (node.typeParameters) {
      node.typeParameters.params.forEach(param => typeParameters[getTypeParameterName(param)] = param)
    }
    return typeParameters
  }

  function getTypeAliasDefinition(path) {
    const node = path.node
    const typeParameters = getTypeParameters(node)
    const isRecursive = isRecursiveType(node)
    const annotation = node.right

    if (isRecursive) {
      recursiveTypes.push(
        t.callExpression(
          t.memberExpression(node.id, t.identifier('define')),
          [getType(annotation, typeParameters)]
        )
      )
      return defineDeclareCombinator(node)
    }

    const typeName = t.stringLiteral(node.id.name)
    return t.variableDeclaration('const', [
      t.variableDeclarator(node.id, getType(annotation, typeParameters, typeName))
    ])
  }

  function defineDeclareCombinator(node) {
    return t.variableDeclaration('const', [
      t.variableDeclarator(node.id, getDeclareCombinator(t.stringLiteral(node.id.name)))
    ])
  }

  function getInterfaceDefinition(node, typeParameters) {
    const isRecursive = isRecursiveType(node)
    const annotation = node.body

    if (isRecursive) {
      recursiveTypes.push(
        t.callExpression(
          t.memberExpression(node.id, t.identifier('define')),
          [getType(annotation, typeParameters)]
        )
      )
      return defineDeclareCombinator(node)
    }

    const typeName = t.stringLiteral(node.id.name)
    return t.variableDeclaration('const', [
      t.variableDeclarator(node.id, getType(annotation, typeParameters, typeName))
    ])
  }

  function getExtendedInterfaceDefinition(node, typeParameters) {
    const isRecursive = isRecursiveType(node)
    const mixins = node.extends.filter(m => m.id.name !== MAGIC_REFINEMENT_NAME)
    typeParameters = mixins.reduce((acc, node) => assign(acc, getTypeParameters(node)), typeParameters)
    const refinements = node.extends.filter(m => m.id.name === MAGIC_REFINEMENT_NAME)
    let props = getObjectExpression(node.body.properties, typeParameters)
    const len = refinements.length
    if (len > 0) {
      props = getInterfaceCombinator(props)
      for (let i = 0; i < len; i++) {
        props = getRefinementCombinator(props, getRefinementPredicateId(refinements[i]))
      }
    }

    if (isRecursive) {
      recursiveTypes.push(
        t.callExpression(
          t.memberExpression(node.id, t.identifier('define')),
          [
            t.callExpression(
              extendId,
              [
                t.arrayExpression(mixins.map(inter => inter.id).concat(props))
              ]
            )
          ]
        )
      )
      return defineDeclareCombinator(node)
    }

    const typeName = t.stringLiteral(node.id.name)
    return t.variableDeclaration('const', [
      t.variableDeclarator(
        node.id,
        t.callExpression(
          extendId,
          [
            t.arrayExpression(mixins.map(inter => inter.id).concat(props)),
            typeName
          ]
        )
      )
    ])
  }

  function buildCodeFrameError(path, error) {
    throw path.buildCodeFrameError(`[${PLUGIN_NAME}] ${error.message}`)
  }

  function preventReservedNamesUsage(path) {
    const name = path.node.id.name
    if (name in RESERVED_NAMES) {
      buildCodeFrameError(path, new Error(`${name} is a reserved interface name for ${PLUGIN_NAME}`))
    }
  }

  function hasRecursiveComment(node) {
    return Array.isArray(node.leadingComments) && node.leadingComments.some(comment => /recursive/.test(comment.value))
  }

  function isRecursiveType(node) {
    return node[IS_RECURSIVE_STORE_FIELD] || hasRecursiveComment(node)
  }

  function isRuntimeTypeIntrospection(node) {
    return node.typeAnnotation &&
           node.typeAnnotation.typeAnnotation &&
           node.typeAnnotation.typeAnnotation.id &&
           node.typeAnnotation.typeAnnotation.id.name === MAGIC_REIFY_NAME
  }

  function getRuntimeTypeIntrospection(node) {
    return node.typeAnnotation.typeAnnotation.typeParameters.params[0].id
  }

  function isTypeExportNamedDeclaration(node) {
    return node.declaration && ( t.isTypeAlias(node.declaration) || t.isInterfaceDeclaration(node.declaration) )
  }

  function findTypeAnnotationInObjectPattern(name, objectPattern, objectTypeAnnotation) {
    if (!objectTypeAnnotation || !t.isObjectTypeAnnotation(objectTypeAnnotation)) {
      return
    }

    for (let property of objectPattern.properties) {
      const typeAnnotation = objectTypeAnnotation.properties.find(propType => (
        propType.key.name === property.key.name
      ))
      if (!typeAnnotation) {
        continue
      }

      if (t.isIdentifier(property.value) && name === property.value.name) {
        return typeAnnotation.value
      } else if (t.isObjectPattern(property.value)) {
        const result = findTypeAnnotationInObjectPattern(name, property.value, typeAnnotation.value)
        if (result) {
          return result
        }
      } else if (t.isArrayPattern(property.value)) {
        const result = findTypeAnnotationInArrayPattern(name, property.value, typeAnnotation.value)
        if (result) {
          return result
        }
      }
    }
  }

  function findTypeAnnotationInArrayPattern(name, arrayPattern, arrayTypeAnnotation) {
    const isGenericArray = arrayTypeAnnotation && t.isGenericTypeAnnotation(arrayTypeAnnotation) && arrayTypeAnnotation.id.name === 'Array'
    if (!arrayTypeAnnotation || !(t.isTupleTypeAnnotation(arrayTypeAnnotation) || isGenericArray)) {
      return
    }

    for (let i = 0, element, length = arrayPattern.elements.length; i < length; i++) {
      element = arrayPattern.elements[i]
      const typeAnnotation = isGenericArray ? arrayTypeAnnotation.typeParameters.params[0] : arrayTypeAnnotation.types[i]
      if (!typeAnnotation) {
        continue
      }

      if (t.isIdentifier(element)) {
        return typeAnnotation
      } else if (t.isObjectPattern(element)) {
        const result = findTypeAnnotationInObjectPattern(name, element, typeAnnotation)
        if (result) {
          return result
        }
      } else if (t.isArrayPattern(element)) {
        const result = findTypeAnnotationInArrayPattern(name, element, typeAnnotation)
        if (result) {
          return result
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

        enter(path, state) {
          hasAsserts = false
          hasTypes = false
          hasExtend = false
          tcombId = path.scope.generateUidIdentifier('t')
          assertId = path.scope.generateUidIdentifier('assert')
          extendId = path.scope.generateUidIdentifier('extend')
          recursiveTypes = []
          if (!globals && state.opts.globals) {
            globals = state.opts.globals.reduce((acc, x) => assign(acc, x), {})
          }
        },

        exit(path, state) {
          const isAssertTemplateRequired = hasAsserts && !state.opts[SKIP_HELPERS_OPTION]
          const isExtendTemplateRequired = hasExtend && !state.opts[SKIP_HELPERS_OPTION]
          const isImportTcombRequired = hasTypes || isAssertTemplateRequired || isExtendTemplateRequired

          if (isImportTcombRequired) {
            path.node.body.unshift(
              t.importDeclaration([t.importDefaultSpecifier(tcombId)], t.stringLiteral(TCOMB_LIBRARY))
            )
          }

          Array.prototype.push.apply(path.node.body, recursiveTypes)

          if (isAssertTemplateRequired) {
            path.node.body.push(assertTemplate({
              warnOnFailure: t.booleanLiteral(!!state.opts[WARN_ON_FAILURE_OPTION]),
              assertId,
              tcombId
            }))
          }

          if (isExtendTemplateRequired) {
            path.node.body.push(extendTemplate({
              extendId,
              tcombId
            }))
          }
        }

      },

      ImportDeclaration(path) {
        const node = path.node
        if (node.importKind === 'type') {
          // transform into normal import
          node.importKind = 'value'
        }
        if (node.specifiers) {
          node.specifiers.forEach(specifier => {
            if (specifier.importKind === 'type') {
              specifier.importKind = null
            }
          })
        }
      },

      ExportNamedDeclaration(path) {
        const node = path.node
        // prevent transform-flow-strip-types
        if (isTypeExportNamedDeclaration(node)) {
          node.exportKind = 'value'
          node.declaration[IS_RECURSIVE_STORE_FIELD] = isRecursiveType(node)
        }
      },

      TypeAlias(path) {
        preventReservedNamesUsage(path)
        hasTypes = true
        path.replaceWith(getTypeAliasDefinition(path))
      },

      InterfaceDeclaration(path) {
        preventReservedNamesUsage(path)
        hasTypes = true
        const node = path.node
        const typeParameters = getTypeParameters(node)
        if (path.node.extends.length > 0) {
          hasExtend = true
          path.replaceWith(getExtendedInterfaceDefinition(node, typeParameters))
        }
        else {
          path.replaceWith(getInterfaceDefinition(node, typeParameters))
        }
      },

      TypeCastExpression(path, state) {
        const node = path.node
        if (isRuntimeTypeIntrospection(node)) {
          try {
            path.replaceWith(getRuntimeTypeIntrospection(node))
          }
          catch (error) {
            buildCodeFrameError(path, new Error(`Invalid use of ${MAGIC_REIFY_NAME}, example: const ReifiedMyType = (({}: any): $Reify<MyType>)`))
          }
        }
        else {
          if (state.opts[SKIP_ASSERTS_OPTION]) {
            return
          }
          hasAsserts = true
          const typeParameters = assign(getTypeParameters(node), node[TYPE_PARAMETERS_STORE_FIELD])
          path.replaceWith(getAssert({
            id: node.expression,
            annotation: node.typeAnnotation.typeAnnotation
          }, typeParameters))
        }
      },

      Class(path) {
        // store type parameters so we can read them later
        const node = path.node
        const typeParameters = getTypeParameters(node)
        path.traverse({
          Function({ node }) {
            node[TYPE_PARAMETERS_STORE_FIELD] = assign(typeParameters, node[TYPE_PARAMETERS_STORE_FIELD])
          }
        })
      },

      VariableDeclaration(path, state) {
        if (state.opts[SKIP_ASSERTS_OPTION]) {
          return
        }

        const node = path.node

        if (node.kind === 'var') return

        for (var i = 0, len = node.declarations.length ; i < len ; i++ ) {
          const declarator = node.declarations[i]
          const id = declarator.id

          if (!id.typeAnnotation) {
            return
          }

          id[TYPE_VARIABLE_STORE_FIELD] = id.typeAnnotation

          if (!declarator.init) {
            return
          }

          hasAsserts = true
          declarator.init = getAssertCallExpression(
            declarator.init,
            id.typeAnnotation.typeAnnotation,
            node[TYPE_PARAMETERS_STORE_FIELD],
            t.stringLiteral(nodeToString(id))
          )
        }
      },

      AssignmentExpression(path, state) {
        if (state.opts[SKIP_ASSERTS_OPTION]) {
          return
        }

        const { node, scope } = path

        let typeAnnotation
        if (t.isIdentifier(node.left)) {
          const name = node.left.name
          const binding = scope.getBinding(name)
          if (!binding || binding.path.type !== 'VariableDeclarator') {
            return
          }

          const declaratorId = binding.path.node.id
          typeAnnotation = declaratorId[TYPE_VARIABLE_STORE_FIELD]

          if (!typeAnnotation || !typeAnnotation.typeAnnotation) {
            return
          }

          typeAnnotation = typeAnnotation.typeAnnotation

          if (t.isObjectPattern(declaratorId)) {
            typeAnnotation = findTypeAnnotationInObjectPattern(name, declaratorId, typeAnnotation)
          } else if (t.isArrayPattern(declaratorId)) {
            typeAnnotation = findTypeAnnotationInArrayPattern(name, declaratorId, typeAnnotation)
          }
        }

        if (!typeAnnotation || typeAnnotation.type === 'AnyTypeAnnotation') {
          return
        }

        hasAsserts = true
        node.right = getAssertCallExpression(
          node.right,
          typeAnnotation,
          node[TYPE_PARAMETERS_STORE_FIELD],
          t.stringLiteral(node.left.name || generate(node.left, { concise: true }).code)
        )
      },

      Function(path, state) {
        const node = path.node
        if (state.opts[SKIP_ASSERTS_OPTION] || node[PROCESSED_FUNCTION_STORE_FIELD]) {
          return
        }
        node[PROCESSED_FUNCTION_STORE_FIELD] = true

        const typeParameters = assign(getTypeParameters(node), node[TYPE_PARAMETERS_STORE_FIELD])

        // store type parameters so we can read them later
        path.traverse({
          'Function|VariableDeclaration|TypeCastExpression'({ node }) {
            node[TYPE_PARAMETERS_STORE_FIELD] = assign(typeParameters, node[TYPE_PARAMETERS_STORE_FIELD])
          }
        })

        try {
          const argumentChecks = getFunctionArgumentCheckExpressions(node, typeParameters)

          if (node.returnType || argumentChecks.length !== 0) {
            let isArrow = false
            // Firstly let's replace arrow function
            if (t.isArrowFunctionExpression(node)) {
              isArrow = true
              /* if (argumentChecks.length !== 0) {
                // replace into normal function with right this
                node.type = "FunctionExpression"
                path.ensureBlock()
                path.replaceWith(t.callExpression(
                  t.memberExpression(node, t.identifier("bind")),
                  [t.thisExpression()]
                ))
              } else */ if (node.expression) {
                // replace into block statement return structures
                node.expression = false
                node.body = t.blockStatement([t.returnStatement(node.body)])
              }
            }

            // If we have a return type then we will wrap our entire function
            // body and insert a type check on the returned value.
            if (node.returnType) {
              hasAsserts = true
              node.body.body = [
                ...argumentChecks,
                getWrappedFunctionReturnWithTypeCheck(isArrow, node.async, node, typeParameters)
              ]
              if (node.async) {
                node.async = false
              }
            } else if (argumentChecks.length > 0) {
              // Prepend any argument checks to the top of our function body.
              hasAsserts = true
              node.body.body.unshift(...argumentChecks)
            }
          }
        }
        catch (error) {
          buildCodeFrameError(path, error)
        }
      }
    }
  }
}
