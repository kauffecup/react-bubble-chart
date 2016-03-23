//------------------------------------------------------------------------------
// Copyright Jonathan Kaufman 2015
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

import d3 from 'd3';

/**
 * Properties defined during construction:
 *   svg
 *   html
 *   legend
 *   bubble
 *   diameter
 *   colorRange
 *   colorLegend
 *   selectedColor
 *   legendSpacing
 *   smallDiameter
 *   textColorRange
 *   mediumDiameter
 *   configureLegend
 *   selectedTextColor
 */
export default class ReactBubbleChartD3 {
  constructor(el, props = {}) {
    this.legendSpacing = typeof props.legendSpacing === 'number' ? props.legendSpacing : 3;
    this.selectedColor = props.selectedColor;
    this.selectedTextColor = props.selectedTextColor;
    this.smallDiameter = props.smallDiameter || 40;
    this.mediumDiameter = props.mediumDiameter || 115;
    this.fontSizeFactor = props.fontSizeFactor;
    this.duration = props.duration === undefined ? 500 : props.duration;
    this.delay = props.delay === undefined ? 7 : props.delay;

    // create an <svg> and <html> element - store a reference to it for later
    this.svg = d3.select(el).append('svg')
      .attr('class', 'bubble-chart-d3')
      .style('overflow', 'visible');
    this.html = d3.select(el).append('div')
      .attr('class', 'bubble-chart-text')
      .style('position', 'absolute')
      .style('left', 0)           // center horizontally
      .style('right', 0)
      .style('margin-left', 'auto')
      .style('margin-right', 'auto');
    this.legend = d3.select(el).append('svg')
      .attr('class', 'bubble-legend')
      .style('overflow', 'visible')
      .style('position', 'absolute');
    this.tooltip = this.html.append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('border-radius', '5px')
      .style('border', '3px solid')
      .style('padding', '5px')
      .style('z-index', 500);
    // create legend and update
    this.adjustSize(el);
    this.update(el, props);
  }

  /**
   * Set this.diameter and this.bubble, also size this.svg and this.html
   */
  adjustSize(el) {
    // helper values for positioning
    this.diameter = Math.min(el.offsetWidth, el.offsetHeight);
    const top  = Math.max((el.offsetHeight - this.diameter)/2, 0);
    // center some stuff vertically
    this.svg.attr('width', this.diameter)
      .attr('height', this.diameter)
      .style('position', 'relative')
      .style('top', top + 'px');   // center vertically
    this.html.style('width', this.diameter + 'px')
      .style('height', this.diameter + 'px')
      .style('top', top + 'px');   // center vertically;

    // create the bubble layout that we will use to position our bubbles\
    this.bubble = d3.layout.pack()
      .sort(null)
      .size([this.diameter, this.diameter])
      .padding(3);
  }

  /**
   * Create and configure the legend
   */
  configureLegend(el, props) {
    this.createLegend = props.legend;
    // for each color in the legend, remove any existing, then
    // create a g and set its transform
    this.legend.selectAll('.legend-key').remove();
    if (!this.createLegend) return;

    const legendRectSize = Math.min(((el.offsetHeight-20) - (this.colorLegend.length-1)*this.legendSpacing)/this.colorLegend.length, 18);
    const legendHeight = this.colorLegend.length * (legendRectSize + this.legendSpacing) - this.legendSpacing;
    this.legend.style('height', legendHeight + 'px')
      .style('width', legendRectSize + 'px')
      .style('top', (el.offsetHeight - legendHeight)/2 + 'px')
      .style('left', 60 + 'px');

    const legendKeys = this.legend.selectAll('.legend-key')
      .data(this.colorLegend)
      .enter()
      .append('g')
      .attr('class', 'legend-key')
      .attr('transform', (d, i) => {
        var height = legendRectSize + this.legendSpacing;
        var vert = i * height;
        return 'translate(' + 0 + ',' + vert + ')';
      });

    // for each <g> create a rect and have its color... be the color
    legendKeys.append('rect')
      .attr('width', legendRectSize)
      .attr('height', legendRectSize)
      .style('fill', c => c.color)
      .style('stroke', c => c.color);

    // add necessary labels to the legend
    legendKeys.append('text')
      .attr('x', legendRectSize + 2)
      .attr('y', legendRectSize - 4)
      .text(c => c.text);
  }

  /**
   * Create and configure the tooltip
   */
  configureTooltip(el, props) {
    this.createTooltip = props.tooltip;
    this.tooltipFunc = props.tooltipFunc;
    // remove all existing divs from the tooltip
    this.tooltip.selectAll('div').remove();
    // intialize the styling
    this.tooltip.style('display', 'none');
    if (!this.createTooltip) return;

    // normalize the prop formats
    this.tooltipProps = (props.tooltipProps || []).map(tp =>
      typeof tp === 'string' ? {css: tp, prop: tp, display: tp} : tp
    );
    // create a div for each of the tooltip props
    for (var {css, prop} of this.tooltipProps) {
      this.tooltip.append('div')
        .attr('class', css);
    }
  }

  /**
   * This is where the magic happens.
   * Update the tooltip and legend.
   * Set up and execute transitions of existing bubbles to new size/location/color.
   * Create and initialize new bubbles.
   * Remove old bubbles.
   * Maintain consistencies between this.svg and this.html
   */
  update(el, props) {
    this.adjustSize(el);
    // initialize color legend values and color range values
    // color range is just an array of the hex values
    // color legend is an array of the color/text objects
    const colorLegend = props.colorLegend || [];
    this.colorRange = colorLegend.map(c =>
      typeof c === 'string' ? c : c.color
    );
    this.colorLegend = colorLegend.slice(0).reverse().map(c =>
      typeof c === 'string' ? {color: c} : c
    );
    this.textColorRange = colorLegend.map(c =>
      typeof c === 'string' ? '#000000' : (c.textColor || '#000000')
    );
    this.configureLegend(el, props);
    this.configureTooltip(el, props);

    const data = props.data;
    if (!data) return;

    const duration = this.duration;
    const delay = this.delay;

    // define a color scale for our colorValues
    const color = d3.scale.quantize()
      .domain([
        props.fixedDomain ? props.fixedDomain.min : d3.min(data, d => d.colorValue),
        props.fixedDomain ? props.fixedDomain.max : d3.max(data, d => d.colorValue)
      ])
      .range(this.colorRange);

    // define a color scale for text town
    const textColor = d3.scale.quantize()
      .domain([
        props.fixedDomain ? props.fixedDomain.min : d3.min(data, d => d.colorValue),
        props.fixedDomain ? props.fixedDomain.max : d3.max(data, d => d.colorValue)
      ])
      .range(this.textColorRange)

    // generate data with calculated layout values
    const nodes = this.bubble.nodes(data.length ? {children: data} : data)
      .filter(d => d.depth); // filter out the outer bubble

    // assign new data to existing DOM for circles and labels
    const circles = this.svg.selectAll('circle')
      .data(nodes, d => 'g' + d._id);
    const labels = this.html.selectAll('.bubble-label')
      .data(nodes, d => 'g' + d._id);

    // update - this is created before enter.append. it only applies to updating nodes.
    // create the transition on the updating elements before the entering elements
    // because enter.append merges entering elements into the update selection
    // for circles we transition their transform, r, and fill
    circles.transition()
      .duration(duration)
      .delay((d, i) => i * delay)
      .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')')
      .attr('r', d => d.r)
      .style('opacity', 1)
      .style('fill', d => d.selected ? this.selectedColor : color(d.colorValue));
    // for the labels we transition their height, width, left, top, and color
    labels
      .on('mouseover', this._tooltipMouseOver.bind(this, color, el))
      .transition()
      .duration(duration)
      .delay((d, i) => i * delay)
      .style('height', d => 2 * d.r + 'px')
      .style('width', d => 2 * d.r + 'px')
      .style('left', d =>  d.x - d.r + 'px')
      .style('top', d =>  d.y - d.r + 'px')
      .style('opacity', 1)
      .style('color', d => d.selected ? this.selectedTextColor : textColor(d.colorValue))
      .attr('class', d => {
        var size;
        if (2*d.r < this.smallDiameter) size = 'small';
        else if (2*d.r < this.mediumDiameter) size = 'medium';
        else size = 'large';
        return 'bubble-label ' + size
      })
      .style('font-size', d => this.fontSizeFactor ? this.fontSizeFactor *  d.r + 'px' : null);

    // enter - only applies to incoming elements (once emptying data)
    if (nodes.length) {
      // initialize new circles
      circles.enter().append('circle')
        .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')')
        .attr('r', 0)
        .attr('class', d => d.children ? 'bubble' : 'bubble leaf')
        .style('fill', d => d.selected ? this.selectedColor : color(d.colorValue))
        .transition()
        .duration(duration * 1.2)
        .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')')
        .attr('r', d => d.r)
        .style('opacity', 1);
      // intialize new labels
      labels.enter().append('div')
        .attr('class', d => {
          var size;
          if (2*d.r < this.smallDiameter) size = 'small';
          else if (2*d.r < this.mediumDiameter) size = 'medium';
          else size = 'large';
          return 'bubble-label ' + size
        })
        .text(d => d.displayText || d._id)
        .on('click', (d, i) => {d3.event.stopPropagation(); props.onClick(d)})
        .on('mouseover', this._tooltipMouseOver.bind(this, color, el))
        .on('mouseout', this._tooltipMouseOut.bind(this))
        .style('position', 'absolute')
        .style('height', d => 2 * d.r + 'px')
        .style('width', d => 2 * d.r + 'px')
        .style('left', d =>  d.x - d.r + 'px')
        .style('top', d =>  d.y - d.r + 'px')
        .style('color', d => d.selected ? this.selectedTextColor : textColor(d.colorValue))
        .style('opacity', 0)
        .transition()
        .duration(duration * 1.2)
        .style('opacity', 1)
        .style('font-size', d => this.fontSizeFactor ? this.fontSizeFactor *  d.r + 'px' : null);
    }

    // exit - only applies to... exiting elements
    // for circles have them shrink to 0 as they're flying all over
    circles.exit()
      .transition()
      .duration(duration)
      .attr('transform', d => {
        const dy = d.y - this.diameter/2;
        const dx = d.x - this.diameter/2;
        const theta = Math.atan2(dy,dx);
        const destX = this.diameter * (1 + Math.cos(theta) )/ 2;
        const destY = this.diameter * (1 + Math.sin(theta) )/ 2;
        return 'translate(' + destX + ',' + destY + ')'; })
      .attr('r', 0)
      .remove();
    // for text have them fade out as they're flying all over
    labels.exit()
      .transition()
      .duration(duration)
      .style('top', d => {
        const dy = d.y - this.diameter/2;
        const dx = d.x - this.diameter/2;
        const theta = Math.atan2(dy,dx);
        const destY = this.diameter * (1 + Math.sin(theta) )/ 2;
        return destY + 'px'; })
      .style('left', d => {
        const dy = d.y - this.diameter/2;
        const dx = d.x - this.diameter/2;
        const theta = Math.atan2(dy,dx);
        const destX = this.diameter * (1 + Math.cos(theta) )/ 2;
        return destX + 'px'; })
      .style('opacity', 0)
      .style('width', 0)
      .style('height', 0)
      .remove();
  }

  /**
   * On mouseover of a bubble, populate the tooltip with that elements info
   * (if this.createTooltip is true of course)
   */
  _tooltipMouseOver(color, el, d, i) {
    if (!this.createTooltip) return;
    for (var {css, prop, display} of this.tooltipProps) {
      this.tooltip.select('.' + css).html((display ? display + ': ' : '') + d[prop]);
    }
    // Fade the popup fill mixing the shape fill with 80% white
    const fill = color(d.colorValue);
    const backgroundColor = d3.rgb(
      d3.rgb(fill).r + 0.8 * (255 - d3.rgb(fill).r),
      d3.rgb(fill).g + 0.8 * (255 - d3.rgb(fill).g),
      d3.rgb(fill).b + 0.8 * (255 - d3.rgb(fill).b)
    );
    this.tooltip.style('display', 'block');

    const tooltipNode = this.tooltip.node();
    if (this.tooltipFunc) {
      this.tooltipFunc(tooltipNode, d, fill)
    }
    const width = tooltipNode.offsetWidth + 1; // +1 for rounding reasons
    const height = tooltipNode.offsetHeight;
    const buffer = 5;

    // calculate where the top is going to be. ideally it is
    // (d.y - height/2) which'll put the tooltip in the middle of the bubble.
    // we need to account for if this'll put it out of bounds.
    var top;
    // if it goes above the bounds, have the top be the buffer
    if (d.y - height < 0) {
      top = buffer;
    // if it goes below the bounds, have its buttom be a buffer length away
    } else if (d.y + height/2 > el.offsetHeight) {
      top = el.offsetHeight - height - buffer;
    // otherwise smack this bad boy in the middle of its bubble
    } else {
      top = d.y - height/2;
    }

    // calculate where the left is going to be. ideally it is
    // (d.x + d.r + buffer) which will put the tooltip to the right
    // of the bubble. we need to account for the case where this puts
    // the tooltip out of bounds.
    var left;
    // if there's room to put it on the right of the bubble, do so
    if (d.x + d.r + width + buffer < el.offsetWidth) {
      left = d.x + d.r + buffer;
    // if there's room to put it on the left of the bubble, do so
    } else if (d.x - d.r - width - buffer > 0) {
      left = d.x - d.r - width - buffer;
    // otherwise put it on the right part of its container
    } else {
      left = el.offsetWidth - width - buffer;
    }

    this.tooltip.style('background-color', backgroundColor)
      .style('border-color', fill)
      .style('width', width + 'px')
      .style('left', left + 'px')
      .style('top', top + 'px');
  }

  /**
   * On tooltip mouseout, hide the tooltip.
   */
  _tooltipMouseOut(d, i) {
    if (!this.createTooltip) return;
    this.tooltip.style('display', 'none')
      .style('width', '')
      .style('top', '')
      .style('left', '');
  }

  /** Any necessary cleanup */
  destroy(el) { }
}
