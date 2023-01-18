import React from 'react';
import { Sector, Cell, PieChart, Pie } from 'recharts';

export const GaugeChart = ({ width, chartValue }) => {
    const colorData = [
      {
        value: 52.5,
        color: '#e91e63',
        title: 'Normal 0'
      }, {
        value: 52.5,
        color: '#ff9800',
        title: 'Boosted 1-4'
      }, {
        value: 52.5,
        color: '#FEDE00',
        title: 'Speedy 5-8'
      }, {
        value: 52.5,
        color: '#4caf50',
        title: 'Turbo 9+'
      }
    ];

    const activeSectorIndex = colorData.map((cur, index, arr) => {
      const curMax = [...arr]
        .splice(0, index + 1)
        .reduce((a, b) => ({ value: a.value + b.value }))
        .value;
      return (chartValue > (curMax - cur.value)) && (chartValue <= curMax);
    })
    .findIndex(cur => cur);

    const sumValues = colorData
      .map(cur => cur.value)
      .reduce((a, b) => a + b);

    const arrowData = [
      { value: chartValue },
      { value: 0 },
      { value: sumValues - chartValue }
    ];

    const pieProps = {
      startAngle: 180,
      endAngle: 0,
      cx: width / 2,
      cy: width / 2
    };

    const pieRadius = {
      innerRadius: (width / 2) * 0.35,
      outerRadius: (width / 2) * 0.4
    };

    const Arrow = ({ cx, cy, midAngle, outerRadius }) => { //eslint-disable-line react/no-multi-comp
      const RADIAN = Math.PI / 180;
      const sin = Math.sin(-RADIAN * midAngle);
      const cos = Math.cos(-RADIAN * midAngle);
      const mx = cx + (outerRadius + width * 0.03) * cos;
      const my = cy + (outerRadius + width * 0.03) * sin;
      return (
        <g>
          <circle cx={cx} cy={cy} r={width * 0.05} fill="#666" stroke="none"/>
          <path d={`M${cx},${cy}L${mx},${my}`} strokeWidth="6" stroke="#666" fill="none" strokeLinecap="round"/>
        </g>
      );
    };

    const ActiveSectorMark = ({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }) => { //eslint-disable-line react/no-multi-comp
      return (
        <g>
          <Sector
            cx={cx}
            cy={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius * 1.2}
            startAngle={startAngle}
            endAngle={endAngle}
            fill={fill}
          />
        </g>
      );
    };

    return (
      <PieChart width={width} height={(width / 2) + 30} title="Speed gauge" margin={{
        top: 0,
        right: 0,
        left: 0,
        bottom: 0,
    }}
>
        <text x="0" y="0" dominantBaseline="hanging" fontSize="30" fontWeight="bold" className="title">Speed Gauge</text>
        <Pie
          activeIndex={activeSectorIndex}
          activeShape={ActiveSectorMark}
          label={(e) => {
            return e.title
          }}
          data={colorData}
          fill="#8884d8"
          { ...pieRadius }
          { ...pieProps }
        >
          {
            colorData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colorData[index].color} />
            ))
          }
        </Pie>
        <Pie
          stroke="none"
          activeIndex={1}
          activeShape={ Arrow }
          data={ arrowData }
          outerRadius={ pieRadius.innerRadius }
          fill="none"
          { ...pieProps }
        />
      </PieChart>
    );
};