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
//   text: string used in legend
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

// for more info, see the README

class ReactBubbleChart extends React.Component {
  render () {
    return <div className={"bubble-chart-container " + this.props.className}></div>;
  }

  componentDidMount () {
    ReactBubbleChartD3.create(this.getDOMNode(), this.getChartState());
  }

  componentDidUpdate () {
    ReactBubbleChartD3.update(this.getDOMNode(), this.getChartState());
  }

  getChartState () {
    return {
      data: this.props.data,
      colorLegend: this.props.colorLegend,
      fixedDomain: this.props.fixedDomain,
      selectedColor: this.props.selectedColor,
      selectedTextColor: this.props.selectedTextColor,
      onClick: this.props.onClick || () => {}
    }
  }

  componentWillUnmount () {
    ReactBubbleChartD3.destroy(this.getDOMNode());
  }

  getDOMNode () {
    return React.findDOMNode(this);
  }
}

export default ReactBubbleChart;
