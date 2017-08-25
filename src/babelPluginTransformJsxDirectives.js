import jsxSyntax from 'babel-plugin-syntax-jsx';
import getDirectives from './getDirectives';
import importDirective from './importDirective';
import createDirective from './createDirective';
import attributesToObject from './attributesToObject';
import getApplicableDirectives from './getApplicableDirectives';

function getUidIds(path) {
  return {
    Elm: path.scope.generateUidIdentifier('Elm'),
    props: path.scope.generateUidIdentifier('props'),
  };
}

export default function babelPluginTransformJsxDirectives(babel) {
  const t = babel.types;

  return {
    inherits: jsxSyntax,
    visitor: {
      JSXOpeningElement(path, state) {
        const directives = getApplicableDirectives(
          t,
          path,
          getDirectives(state.opts)
        );

        if (!directives.length) {
          return;
        }

        const jsxElement = path.parentPath;
        const name = path.get('name.name').node;
        const isComponent = name[0] === name[0].toUpperCase();
        const attributes = attributesToObject(t, path.get('attributes'), directives);
        const { Elm, props } = getUidIds(path);
        const children = jsxElement.node.children;

        const { inner } = directives.reduce((
          memo,
          { name: directiveName, source, options },
          i
        ) => {
          const localName = importDirective(babel, path, directiveName, source);

          const isOuter = i === directives.length - 1;
          if (!isOuter) {
            const {
              Elm: newElm,
              props: newProps,
            } = getUidIds(path);

            return {
              inner: createDirective(
                t,
                localName,
                memo,
                t.jSXExpressionContainer(newElm),
                newProps,
                options
              ),
              Elm: newElm,
              props: newProps,
            };
          }

          return {
            inner: createDirective(
              t,
              localName,
              memo,
              isComponent
                ? t.jSXExpressionContainer(t.identifier(name))
                : t.stringLiteral(name),
              attributes,
              options
            ),
          };
        }, {
          Elm,
          props,
          inner: t.jSXElement(
            t.jSXOpeningElement(
              t.jSXIdentifier(Elm.name),
              [t.jSXSpreadAttribute(props)],
              children.length === 0
            ),
            t.jSXClosingElement(t.jSXIdentifier(Elm.name)),
            children,
            children.length === 0
          ),
        });

        jsxElement.replaceWith(inner);
      },
    },
  };
}