/**
 * Copyright 2013 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @jsx React.DOM
 * @emails react-core
 */

/*jslint evil: true */

"use strict";

var mocks = require("../../mocks");

describe('ReactNativeComponent', function() {

  describe('updateDOM', function() {
    var React;
    var ReactTestUtils;
    var transaction;

    beforeEach(function() {
      React = require("../../React");
      ReactTestUtils = require("../../ReactTestUtils");

      var ReactReconcileTransaction = require("../../ReactReconcileTransaction");
      transaction = new ReactReconcileTransaction();
    });

    it("should handle className", function() {
      var stub = ReactTestUtils.renderIntoDocument(React.DOM.div( {style:{}} ));

      stub.receiveProps({ className: 'foo' }, transaction);
      expect(stub.getDOMNode().className).toEqual('foo');
      stub.receiveProps({ className: 'bar' }, transaction);
      expect(stub.getDOMNode().className).toEqual('bar');
      stub.receiveProps({ className: null }, transaction);
      expect(stub.getDOMNode().className).toEqual('');
    });

    it("should gracefully handle various style value types", function() {
      var stub = ReactTestUtils.renderIntoDocument(React.DOM.div( {style:{}} ));
      var stubStyle = stub.getDOMNode().style;

      // set initial style
      var setup = { display: 'block', left: '1', top: 2, fontFamily: 'Arial' };
      stub.receiveProps({ style: setup }, transaction);
      expect(stubStyle.display).toEqual('block');
      expect(stubStyle.left).toEqual('1px');
      expect(stubStyle.fontFamily).toEqual('Arial');

      // reset the style to their default state
      var reset = { display: '', left: null, top: false, fontFamily: true };
      stub.receiveProps({ style: reset }, transaction);
      expect(stubStyle.display).toEqual('');
      expect(stubStyle.left).toEqual('');
      expect(stubStyle.top).toEqual('');
      expect(stubStyle.fontFamily).toEqual('');
    });

    it("should update styles when mutating style object", function() {
      var styles = { display: 'none', fontFamily: 'Arial', opacity: 0 };
      var stub = ReactTestUtils.renderIntoDocument(React.DOM.div( {style:styles} ));

      var stubStyle = stub.getDOMNode().style;
      stubStyle.display = styles.display;
      stubStyle.fontFamily = styles.fontFamily;

      styles.display = 'block';

      stub.receiveProps({ style: styles }, transaction);
      expect(stubStyle.display).toEqual('block');
      expect(stubStyle.fontFamily).toEqual('Arial');
      expect(stubStyle.opacity).toEqual('0');

      styles.fontFamily = 'Helvetica';

      stub.receiveProps({ style: styles }, transaction);
      expect(stubStyle.display).toEqual('block');
      expect(stubStyle.fontFamily).toEqual('Helvetica');
      expect(stubStyle.opacity).toEqual('0');

      styles.opacity = 0.5;

      stub.receiveProps({ style: styles }, transaction);
      expect(stubStyle.display).toEqual('block');
      expect(stubStyle.fontFamily).toEqual('Helvetica');
      expect(stubStyle.opacity).toEqual('0.5');
    });

    it("should update styles if initially null", function() {
      var styles = null;
      var stub = ReactTestUtils.renderIntoDocument(React.DOM.div( {style:styles} ));

      var stubStyle = stub.getDOMNode().style;

      styles = {display: 'block'};

      stub.receiveProps({ style: styles }, transaction);
      expect(stubStyle.display).toEqual('block');
    });

    it("should remove attributes", function() {
      var stub = ReactTestUtils.renderIntoDocument(React.DOM.img( {height:"17"} ));

      expect(stub.getDOMNode().hasAttribute('height')).toBe(true);
      stub.receiveProps({}, transaction);
      expect(stub.getDOMNode().hasAttribute('height')).toBe(false);
    });

    it("should remove properties", function() {
      var stub = ReactTestUtils.renderIntoDocument(React.DOM.div( {className:"monkey"} ));

      expect(stub.getDOMNode().className).toEqual('monkey');
      stub.receiveProps({}, transaction);
      expect(stub.getDOMNode().className).toEqual('');
    });

    it("should clear a single style prop when changing 'style'", function() {
      var styles = {display: 'none', color: 'red'};
      var stub = ReactTestUtils.renderIntoDocument(React.DOM.div( {style:styles} ));

      var stubStyle = stub.getDOMNode().style;

      styles = {color: 'green'};
      stub.receiveProps({ style: styles }, transaction);
      expect(stubStyle.display).toEqual('');
      expect(stubStyle.color).toEqual('green');
    });

    it("should clear all the styles when removing 'style'", function() {
      var styles = {display: 'none', color: 'red'};
      var stub = ReactTestUtils.renderIntoDocument(React.DOM.div( {style:styles} ));

      var stubStyle = stub.getDOMNode().style;

      stub.receiveProps({}, transaction);
      expect(stubStyle.display).toEqual('');
      expect(stubStyle.color).toEqual('');
    });

    it("should empty element when removing innerHTML", function() {
      var stub = ReactTestUtils.renderIntoDocument(
        React.DOM.div( {dangerouslySetInnerHTML:{__html: ":)"}} )
      );

      expect(stub.getDOMNode().innerHTML).toEqual(':)');
      stub.receiveProps({}, transaction);
      expect(stub.getDOMNode().innerHTML).toEqual('');
    });

    it("should not incur unnecessary DOM mutations", function() {
      var stub = ReactTestUtils.renderIntoDocument(React.DOM.div( {value:""} ));

      var node = stub.getDOMNode();
      var nodeValue = node.value;
      var nodeValueSetter = mocks.getMockFunction();
      Object.defineProperty(node, 'value', {
        get: function() {
          return nodeValue;
        },
        set: nodeValueSetter.mockImplementation(function(newValue) {
          nodeValue = newValue;
        })
      });

      stub.receiveProps({value: ''}, transaction);
      expect(nodeValueSetter.mock.calls.length).toBe(0);

      stub.receiveProps({}, transaction);
      expect(nodeValueSetter.mock.calls.length).toBe(1);
    });
  });

  describe('createOpenTagMarkup', function() {
    var genMarkup;

    function quoteRegexp(str) {
      return (str+'').replace(/([.?*+\^$\[\]\\(){}|-])/g, "\\$1");
    }

    beforeEach(function() {
      require("../../mock-modules").dumpCache();

      var mixInto = require("../../mixInto");
      var ReactNativeComponent = require("../../ReactNativeComponent");

      var NodeStub = function(initialProps) {
        this.props = initialProps || {};
        this._rootNodeID = 'test';
      };
      mixInto(NodeStub, ReactNativeComponent.Mixin);

      genMarkup = function(props) {
        return (new NodeStub(props))._createOpenTagMarkup();
      };

      this.addMatchers({
        toHaveAttribute: function(attr, value) {
          var expected = '(?:^|\\s)' + attr + '=[\\\'"]';
          if (typeof value != 'undefined') {
            expected += quoteRegexp(value) + '[\\\'"]';
          }
          return this.actual.match(new RegExp(expected));
        }
      });
    });

    it("should handle className", function() {
      expect(genMarkup({ className: 'a' })).toHaveAttribute('class', 'a');
      expect(genMarkup({ className: 'a b' })).toHaveAttribute('class', 'a b');
      expect(genMarkup({ className: '' })).toHaveAttribute('class', '');
    });
  });

  describe('createContentMarkup', function() {
    var genMarkup;

    function quoteRegexp(str) {
      return (str+'').replace(/([.?*+\^$\[\]\\(){}|-])/g, "\\$1");
    }

    beforeEach(function() {
      require("../../mock-modules").dumpCache();

      var mixInto = require("../../mixInto");
      var ReactNativeComponent = require("../../ReactNativeComponent");
      var ReactReconcileTransaction = require("../../ReactReconcileTransaction");

      var NodeStub = function(initialProps) {
        this.props = initialProps || {};
        this._rootNodeID = 'test';
      };
      mixInto(NodeStub, ReactNativeComponent.Mixin);

      genMarkup = function(props) {
        var transaction = new ReactReconcileTransaction();
        return (new NodeStub(props))._createContentMarkup(transaction);
      };

      this.addMatchers({
        toHaveInnerhtml: function(html) {
          var expected = '^' + quoteRegexp(html) + '$';
          return this.actual.match(new RegExp(expected));
        }
      });
    });

    it("should handle dangerouslySetInnerHTML", function() {
      var innerHTML = {__html: 'testContent'};
      expect(
        genMarkup({ dangerouslySetInnerHTML: innerHTML })
      ).toHaveInnerhtml('testContent');
    });
  });

  describe('mountComponent', function() {
    var mountComponent;

    beforeEach(function() {
      require("../../mock-modules").dumpCache();

      var mixInto = require("../../mixInto");
      var ReactComponent = require("../../ReactComponent");
      var ReactMultiChild = require("../../ReactMultiChild");
      var ReactNativeComponent = require("../../ReactNativeComponent");
      var ReactReconcileTransaction = require("../../ReactReconcileTransaction");

      var StubNativeComponent = function(initialProps) {
        ReactComponent.Mixin.construct.call(this, initialProps);
      };
      mixInto(StubNativeComponent, ReactComponent.Mixin);
      mixInto(StubNativeComponent, ReactNativeComponent.Mixin);
      mixInto(StubNativeComponent, ReactMultiChild.Mixin);

      mountComponent = function(props) {
        var transaction = new ReactReconcileTransaction();
        var stubComponent = new StubNativeComponent(props);
        return stubComponent.mountComponent('test', transaction);
      };
    });

    it("should validate against multiple children props", function() {
      expect(function() {
        mountComponent({ content: '', children: '' });
      }).toThrow(
        'Invariant Violation: Can only set one of `children`, ' +
        '`props.content`, or `props.dangerouslySetInnerHTML`.'
      );

      expect(function() {
        mountComponent({ content: '', dangerouslySetInnerHTML: '' });
      }).toThrow(
        'Invariant Violation: Can only set one of `children`, ' +
        '`props.content`, or `props.dangerouslySetInnerHTML`.'
      );

      expect(function() {
        mountComponent({ children: '', dangerouslySetInnerHTML: '' });
      }).toThrow(
        'Invariant Violation: Can only set one of `children`, ' +
        '`props.content`, or `props.dangerouslySetInnerHTML`.'
      );
    });

    it("should validate against invalid styles", function() {
      expect(function() {
        mountComponent({ style: 'display: none' });
      }).toThrow(
        'Invariant Violation: The `style` prop expects a mapping from style ' +
        'properties to values, not a string.'
      );
    });
  });

  describe('unmountComponent', function() {
    it("should clean up listeners", function() {
      var React = require("../../React");
      var ReactEventEmitter = require("../../ReactEventEmitter");
      var ReactID = require("../../ReactID");

      var container = document.createElement('div');
      document.documentElement.appendChild(container);

      var callback = function() {};
      var instance = React.DOM.div( {onClick:callback} );
      React.renderComponent(instance, container);

      var rootNode = instance.getDOMNode();
      var rootNodeID = ReactID.getID(rootNode);
      expect(
        ReactEventEmitter.getListener(rootNodeID, 'onClick')
      ).toBe(callback);

      React.unmountAndReleaseReactRootNode(container);

      expect(
        ReactEventEmitter.getListener(rootNodeID, 'onClick')
      ).toBe(undefined);
    });
  });

});
