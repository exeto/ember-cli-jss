import Mixin from '@ember/object/mixin';
import { assert } from '@ember/debug';
import EmObject, { computed } from '@ember/object';

import StyleSheet from './stylesheet';
import { uniqKey, isBool } from './utils';

const classNamesKey = uniqKey('classNames');
const classNameBindingsKey = uniqKey('classNameBindings');
const setupKey = uniqKey('setup');

const createBindings = context => {
  const observedProperties = context.jssNameBindings.map(
    items => items.split(':')[0],
  );

  Mixin.create({
    [classNameBindingsKey]: computed('classes', ...observedProperties, () => {
      const classes = context.get('classes');

      return context.jssNameBindings
        .map(item => {
          const items = item.split(':');
          const [key, truthy, falsy] = items;
          const value = context.get(key);

          if (items.length === 1) {
            const targetName = isBool(value) ? key : value;

            return classes[targetName];
          }

          return value ? classes[truthy] : classes[falsy];
        })
        .join(' ');
    }).readOnly(),
  }).apply(context);
};

export default Mixin.create({
  jssNames: [],
  jssNameBindings: [],
  jssObservedProps: [],
  classes: {},

  classNameBindings: [classNamesKey, classNameBindingsKey],

  [classNamesKey]: computed('classes', 'jssNames.[]', function() {
    return this.jssNames.map(name => this.get(`classes.${name}`)).join(' ');
  }).readOnly(),

  init(...args) {
    this._super(...args);

    assert(
      'Only instance of StyleSheet allowed for "stylesheet"',
      this.get('stylesheet') instanceof StyleSheet,
    );

    assert(
      'Only arrays are allowed for "jssNames"',
      Array.isArray(this.jssNames),
    );

    assert(
      'Only arrays are allowed for "jssObservedProps"',
      Array.isArray(this.jssObservedProps),
    );

    assert(
      'Only arrays are allowed for "jssNameBindings"',
      Array.isArray(this.jssNameBindings),
    );

    this[setupKey]();
  },

  [setupKey]() {
    createBindings(this);

    const componentName = String(this).match(/:(.+?):/)[1];
    const id = this.elementId;

    this.stylesheet.attach(id, componentName);

    const classes = EmObject.create(this.stylesheet.sheet.classes);
    const sheet = this.stylesheet.dynamicSheets[id];
    const fields = this.get('jssObservedProps') || [];
    const update = () => sheet.update(this.getProperties(fields));

    this.set('classes', classes);

    update();

    fields.forEach(field => this.addObserver(field, this, update));
  },

  willDestroyElement(...args) {
    this._super(...args);
    this.stylesheet.detach(this.elementId);
  },
});
