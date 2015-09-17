//------------------------------------------------------------------------------
// Copyright Jonathan Kaufman Corp. 2015
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//------------------------------------------------------------------------------

import ReactBubbleChartD3 from './ReactBubbleChartD3';
import React              from 'react';

// Description of props!

// data format:
// {
//    _id: string,        // unique id (required)
//    value: number,      // used to determine relative size of bubbles (required)
//    displayText: string,// will use _id if undefined
//    colorValue: number, // used to determine color
//    selected: boolean,  // if true will use selectedColor/selectedTextColor for circle/text
// }

// colorLegend format:
// string || {
//   color: string,
//   text: string used in legend,
//   textColor: string (optional) - if specified will use this for the text color when
//              over bubbles with that color
// }

// fixedDomain (optional)
// Used in tandum with the color legend. If defined, the minimum number corresponds
// to the minimum value in the color legend array, and the maximum corresponds to
// the max. The rest of the `colorValue` values will use a quantized domain to find
// their spot.
// If this is undefined we will use the min and max of the `colorValue`s of the
// dataset.
// {
//   min: number,
//   max: number
// }

// selectedColor
// String hex value.
// If defined, will use this to color the circle corresponding to the data object
// whose `selected` property is true.

// selectedTextColor
// String hex value.
// If defined, will use this to color the text corresponding to the data object
// whose `selected` property is true.

// onClick
// Can pass a function that will be called with the data object when that bubble is
// clicked on.

// smallDiameter
// Can pass a number below which the label div will have the `small` class added.
// defaults to 40

// mediumDiameter
// Can pass a number below which the label div will have the `medium` class added,
// and above which the `large` class will be added. Defaults to 115.

// for more info, see the README

class ReactBubbleChart extends React.Component {
  constructor(props) {
    super(props);
    // define the method this way so that we have a clear reference to it
    // this is necessary so that window.removeEventListener will work properly
    this.handleResize = (e => this._handleResize(e));
  }

  /** Render town */
  render() {
    return <div className={"bubble-chart-container " + this.props.className}></div>;
  }

  /** When we mount, intialize resize handler and create the bubbleChart */
  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    this.bubbleChart = new ReactBubbleChartD3(this.getDOMNode(), this.getChartState());
  }

  /** When we update, update our friend, the bubble chart */
  componentDidUpdate() {
    this.bubbleChart.update(this.getDOMNode(), this.getChartState());
  }

  /** Define what props get passed down to the d3 chart */
  getChartState() {
    return {
      data: this.props.data,
      colorLegend: this.props.colorLegend,
      fixedDomain: this.props.fixedDomain,
      selectedColor: this.props.selectedColor,
      selectedTextColor: this.props.selectedTextColor,
      onClick: this.props.onClick || () => {},
      smallDiameter: this.props.smallDiameter,
      mediumDiameter: this.props.mediumDiameter
    }
  }

  /** When we're piecing out, remove the handler and destroy the chart */
  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    this.bubbleChart.destroy(this.getDOMNode());
  }

  /** Helper method to reference this dom node */
  getDOMNode() {
    return React.findDOMNode(this);
  }

  /** On a debounce, adjust the size of our graph area and then update the chart */
  _handleResize(e) {
    this.__resizeTimeout && clearTimeout(this.__resizeTimeout);
    this.__resizeTimeout = setTimeout(() => {
      this.bubbleChart.adjustSize(this.getDOMNode());
      this.bubbleChart.update(this.getDOMNode(), this.getChartState());
      delete this.__resizeTimeout;
    }, 200);
  }
}

export default ReactBubbleChart;
