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
 *   selectedTextColor
 */
export default class ReactBubbleChartD3 {

  constructor(el, props) {
    props = props || {};
    this.legendSpacing = 3;
    this.selectedColor = props.selectedColor;
    this.selectedTextColor = props.selectedTextColor;
    this.smallDiameter = props.smallDiameter || 40;
    this.mediumDiameter = props.mediumDiameter || 115;

    // create an <svg> and <html> element - store a reference to it for later
    this.svg = d3.select(el).append('svg');
    this.html = d3.select(el).append('div');
    this.legend = d3.select(el).append('svg')

    // create legend and update
    this.adjustSize(el);
    this.update(el, props);
  }

  adjustSize(el) {
    // helper values for positioning
    this.diameter = Math.min(el.offsetWidth, el.offsetHeight);
    var top  = Math.max((el.offsetHeight - this.diameter)/2, 0);

    // center some stuff vertically
    this.svg.attr('width', this.diameter)
      .attr('height', this.diameter)
      .style('position', 'relative')
      .style('top', top + 'px')   // center vertically
      .attr('class', 'bubble-chart-d3');
    this.html.style('width', this.diameter + 'px')
      .style('height', this.diameter + 'px')
      .style('position', 'absolute')
      .style('top', top + 'px')   // center vertically
      .style('left', 0)           // center horizontally
      .style('right', 0)
      .style('margin-left', 'auto')
      .style('margin-right', 'auto')
      .attr('class', 'bubble-chart-text');

    // create the bubble layout that we will use to position our bubbles\
    this.bubble = d3.layout.pack()
      .sort(null)
      .size([this.diameter, this.diameter])
      .padding(3);
  }

  /** create and configure the legend */
  configureLegend(el, props) {
    // initialize color legend values and color range values
    // color range is just an array of the hex values
    // color legend is an array of the color/text objects
    var colorLegend = props.colorLegend || [];
    this.colorRange = colorLegend.map(c =>
      typeof c === 'string' ? c : c.color
    );
    this.colorLegend = colorLegend.slice(0).reverse().map(c =>
      typeof c === 'string' ? {color: c} : c
    );
    this.textColorRange = colorLegend.map(c =>
      typeof c === 'string' ? '#000000' : (c.textColor || '#000000')
    );

    var legendRectSize = Math.min((el.offsetHeight - (this.colorLegend.length-1)*this.legendSpacing)/this.colorLegend.length, 18);
    var legendHeight = this.colorLegend.length * (legendRectSize + this.legendSpacing) - this.legendSpacing;
    this.legend.attr('class', 'bubble-legend')
      .style('position', 'absolute')
      .style('height', legendHeight + 'px')
      .style('width', '100px')
      .style('top', (el.offsetHeight - legendHeight)/2 + 'px')
      .style('left', 60 + 'px');

    // for each color in the legend, remove any existing, then
    // create a g and set its transform
    this.legend.selectAll('.legend-key').remove();
    var legendKeys = this.legend.selectAll('.legend-key')
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
      .attr('x', legendRectSize + this.legendSpacing)
      .attr('y', legendRectSize - this.legendSpacing)
      .text(c => c.text);
  }

  update(el, props) {
    this.adjustSize(el);
    this.configureLegend(el, props);
    var duration = 500;
    var delay = 0;
    var data = props.data;
    if (!data) return;
    
    // define a color scale for our colorValues
    var color = d3.scale.quantize()
      .domain([
        props.fixedDomain ? props.fixedDomain.min : d3.min(data, d => d.colorValue),
        props.fixedDomain ? props.fixedDomain.max : d3.max(data, d => d.colorValue)
      ])
      .range(this.colorRange);

    // define a color scale for text town
    var textColor = d3.scale.quantize()
      .domain([
        props.fixedDomain ? props.fixedDomain.min : d3.min(data, d => d.colorValue),
        props.fixedDomain ? props.fixedDomain.max : d3.max(data, d => d.colorValue)
      ])
      .range(this.textColorRange)

    // generate data with calculated layout values
    var nodes = this.bubble.nodes({children: data})
      .filter((d) => !d.children); // filter out the outer bubble

    // assign new data to existing DOM for circles and labels
    var circles = this.svg.selectAll('circle')
      .data(nodes, (d) => 'g' + d._id);
    var labels = this.html.selectAll('.bubble-label')
      .data(nodes, (d) => 'g' + d._id);

    // update - this is created before enter.append. it only applies to updating nodes.
    // create the transition on the updating elements before the entering elements 
    // because enter.append merges entering elements into the update selection
    // for circles we transition their transform, r, and fill
    circles.transition()
      .duration(duration)
      .delay((d, i) => {delay = i * 7; return delay;})
      .attr('transform', (d) => 'translate(' + d.x + ',' + d.y + ')')
      .attr('r', (d) => d.r)
      .style('opacity', 1)
      .style('fill', d => d.selected ? this.selectedColor : color(d.colorValue));
    // for the labels we transition their height, width, left, top, and color
    labels.transition()
      .duration(duration)
      .delay((d, i) => {delay = i * 7; return delay;})
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
      });

    // enter - only applies to incoming elements (once emptying data)
    if (data.length) {
      // initialize new circles
      circles.enter().append('circle')
        .attr('transform', (d) => 'translate(' + d.x + ',' + d.y + ')')
        .attr('r', (d) => 0)
        .attr('class', 'bubble')
        .style('fill', d => d.selected ? this.selectedColor : color(d.colorValue))
        .transition()
        .duration(duration * 1.2)
        .attr('transform', (d) => 'translate(' + d.x + ',' + d.y + ')')
        .attr('r', (d) => d.r)
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
        .on('click', (d,i) => {d3.event.stopPropagation(); props.onClick(d)})
        .style('position', 'absolute')
        .style('height', d => 2 * d.r + 'px')
        .style('width', d => 2 * d.r + 'px')
        .style('left', d =>  d.x - d.r + 'px')
        .style('top', d =>  d.y - d.r + 'px')
        .style('color', d => d.selected ? this.selectedTextColor : textColor(d.colorValue))
        .style('opacity', 0)
        .transition()
        .duration(duration * 1.2)
        .style('opacity', 1);
    }

    // exit - only applies to... exiting elements
    // for circles have them shrink to 0 as they're flying all over
    circles.exit()
      .transition()
      .duration(duration)
      .attr('transform', (d) => {
        var dy = d.y - this.diameter/2;
        var dx = d.x - this.diameter/2;
        var theta = Math.atan2(dy,dx);
        var destX = this.diameter * (1 + Math.cos(theta) )/ 2;
        var destY = this.diameter * (1 + Math.sin(theta) )/ 2; 
        return 'translate(' + destX + ',' + destY + ')'; })
      .attr('r', 0)
      .remove();
    // for text have them fade out as they're flying all over
    labels.exit()
      .transition()
      .duration(duration)
      .style('top', (d) => {
        var dy = d.y - this.diameter/2;
        var dx = d.x - this.diameter/2;
        var theta = Math.atan2(dy,dx);
        var destY = this.diameter * (1 + Math.sin(theta) )/ 2; 
        return destY + 'px'; })
      .style('left', (d) => { 
        var dy = d.y - this.diameter/2;
        var dx = d.x - this.diameter/2;
        var theta = Math.atan2(dy,dx);
        var destX = this.diameter * (1 + Math.cos(theta) )/ 2;
        return destX + 'px'; })
      .style('opacity', 0)
      .style('width', 0)
      .style('height', 0)
      .remove();
  }

  /** Any necessary cleanup */
  destroy(el) { }
}
