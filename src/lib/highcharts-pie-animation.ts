/**
 * Custom fan-style entrance animation for Highcharts pie charts.
 * Slices animate in sequentially, then data labels fade in.
 * Based on: https://www.highcharts.com/demo/highcharts/pie-custom-entrance-animation
 */

import Highcharts from 'highcharts';

(function (H: typeof Highcharts) {
    const PieSeries = H.seriesTypes.pie;
    if (!PieSeries?.prototype) return;

    PieSeries.prototype.animate = function (init: boolean) {
        const series = this;
        const chart = series.chart;
        const points = series.points;
        const { animation } = series.options;
        const startAngleRad = (series as unknown as { startAngleRad: number }).startAngleRad ?? 0;

        function fanAnimate(
            point: Highcharts.SeriesPiePoint,
            startAngleRad: number,
        ) {
            const graphic = point.graphic;
            const args = point.shapeArgs as { start?: number; end?: number } | undefined;

            if (graphic && args) {
                graphic
                    .attr({
                        start: startAngleRad,
                        end: startAngleRad,
                        opacity: 1,
                    })
                    .animate(
                        {
                            start: args.start ?? 0,
                            end: args.end ?? 0,
                        },
                        {
                            duration: (animation?.duration ?? 1000) / points.length,
                        },
                        function (this: Highcharts.SVGElement) {
                            const nextPoint = points[point.index + 1];
                            if (nextPoint) {
                                fanAnimate(
                                    nextPoint as Highcharts.SeriesPiePoint,
                                    args.end ?? 0,
                                );
                            }
                            if (point.index === series.points.length - 1) {
                                const dataLabelsGroup = (series as unknown as { dataLabelsGroup?: Highcharts.SVGElement }).dataLabelsGroup;
                                if (dataLabelsGroup) {
                                    dataLabelsGroup.animate({ opacity: 1 }, undefined, function () {
                                        points.forEach((p) => {
                                            (p as Highcharts.SeriesPiePoint).opacity = 1;
                                        });
                                        series.update({ enableMouseTracking: true }, false);
                                        chart.update(
                                            {
                                                plotOptions: {
                                                    pie: {
                                                        innerSize: '40%',
                                                        borderRadius: 8,
                                                    },
                                                },
                                            },
                                            false,
                                        );
                                    });
                                } else {
                                    series.update({ enableMouseTracking: true }, false);
                                    chart.update(
                                        {
                                            plotOptions: {
                                                pie: {
                                                    innerSize: '40%',
                                                    borderRadius: 8,
                                                },
                                            },
                                        },
                                        false,
                                    );
                                }
                            }
                        },
                    );
            }
        }

        if (init) {
            points.forEach((point) => {
                (point as Highcharts.SeriesPiePoint).opacity = 0;
            });
        } else {
            const first = points[0];
            if (first) {
                fanAnimate(first as Highcharts.SeriesPiePoint, startAngleRad);
            }
        }
    };
})(Highcharts);
