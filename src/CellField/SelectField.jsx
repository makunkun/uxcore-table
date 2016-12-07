const assign = require('object-assign');
const Select = require('uxcore-select2');
const React = require('react');
const NattyFetch = require('natty-fetch');
const Promise = require('lie');
const isEqual = require('lodash/isEqual');

const CellField = require('uxcore-cell-field');

const { Option } = Select;

const getTextFromValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(item => item.label).join(', ');
  } else if (typeof value === 'object') {
    return value.label;
  }
  return '';
};

const processValue = (value) => {
  if (typeof value !== 'object') {
    if (value === undefined || value === null) {
      return value;
    }
    return {
      key: value,
    };
  }
  return value;
};


class SelectField extends CellField {

  constructor(props) {
    super(props);
    const me = this;
    assign(me.state, {
      data: me.getConfig().data,
    });
  }

  componentWillReceiveProps(nextProps) {
    const me = this;
    if (!isEqual(nextProps.data, me.props.data)) {
      me.setState({
        data: nextProps.data,
      });
    }
  }

  componentDidMount() {
    const me = this;
    me.fetchData();
  }

  getConfig() {
    const me = this;
    return me.props.column.config || {};
  }

  fetchData(value) {
    const me = this;
    const config = me.getConfig();
    const defaultBeforeFetch = data => data;
    const defaultAfterFetch = data => data;
    if (!config.fetchUrl) {
      return;
    }
    if (me.fetch) {
      me.fetch.abort();
    }
    me.fetch = NattyFetch.create({
      url: config.fetchUrl,
      jsonp: config.dataType
        ? config.dataType === 'jsonp'
        : (/\.jsonp/.test(config.fetchUrl)),
      data: (config.beforeFetch || defaultBeforeFetch)({
        q: value,
      }),
      fit: (response) => {
        const content = response.content || response;
        let success = true;
        if (response.success !== undefined) {
          success = response.success;
        } else if (response.hasError !== undefined) {
          success = !response.hasError;
        }
        return {
          content,
          success,
        };
      },
      Promise,
    });
    me.fetch().then((content) => {
      const fetchData = (config.afterFetch || defaultAfterFetch)(content);
      me.setState({
        data: fetchData,
      });
    }).catch((e) => {
      console.error(e.stack);
    });
  }

  renderChildren() {
    const me = this;
    const { column, rowData } = me.props;
    const { renderChildren } = column;
    if (renderChildren) {
      return renderChildren(rowData);
    }
    return (me.state.data || []).map(item => <Option key={item.value}>{item.text}</Option>);
  }

  renderContent() {
    const me = this;
    const propsToDelete = ['value', 'data', 'onChange'];
    const fieldProps = {
      onChange: (value) => {
        me.handleDataChange({
          text: getTextFromValue(value),
          value,
        });
      },
      labelInValue: true,
      value: processValue(me.props.value),
    };
    if (me.props.column.config) {
      const customProps = { ...me.props.column.config };
      propsToDelete.forEach((item) => {
        delete customProps[item];
      });
      assign(fieldProps, customProps);
    }
    return (
      <Select {...fieldProps}>
        {me.renderChildren()}
      </Select>
    );
  }

}

SelectField.propTypes = assign({}, CellField.propTypes);

SelectField.defaultProps = assign({}, CellField.defaultProps);

module.exports = SelectField;
