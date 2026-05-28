import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { LayoutLink, LayoutPerson, LayoutResult, LayoutUnion } from "../diagram/layout";

type Props = {
  layout: LayoutResult;
};

const PERSON_W = 112;
const PERSON_H = 84;

export function GenogramSvg({ layout }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    svg.attr("viewBox", `0 0 ${layout.width} ${layout.height}`).attr("role", "img");
    const root = svg.append("g").attr("class", "viewport");

    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#6d7480");

    const linkLayer = root.append("g").attr("class", "links");
    const unionLayer = root.append("g").attr("class", "union-nodes");
    const peopleLayer = root.append("g").attr("class", "people");

    const linkPaths = linkLayer
      .selectAll<SVGPathElement, LayoutLink>("path")
      .data(layout.links, (link) => link.id)
      .join("path")
      .attr("class", (link) => `link link-${link.kind} ${link.emotionalKind ? `emotion-${link.emotionalKind}` : ""} relationship-${link.relationship ?? "none"}`)
      .attr("d", linkPath)
      .attr("marker-end", (link) => (link.kind === "emotional" ? "url(#arrow)" : null));

    const redrawLinks = () => linkPaths.attr("d", linkPath);

    unionLayer
      .selectAll<SVGGElement, LayoutUnion>("g")
      .data(layout.unions, (union) => union.id)
      .join("g")
      .attr("class", "union-node")
      .attr("transform", (union) => `translate(${union.x},${union.y})`)
      .call(
        d3
          .drag<SVGGElement, LayoutUnion>()
          .on("drag", function (event, union) {
            union.x = event.x;
            union.y = event.y;
            d3.select(this).attr("transform", `translate(${union.x},${union.y})`);
            redrawLinks();
          }),
      )
      .each(function (union) {
        const group = d3.select<SVGGElement, LayoutUnion>(this);
        group.append("circle").attr("r", 8);
        group.append("title").text(`${union.relationship} union`);
      });

    const personGroups = peopleLayer
      .selectAll<SVGGElement, LayoutPerson>("g")
      .data(layout.people, (person) => person.id)
      .join("g")
      .attr("class", (person) => `person gender-${person.gender}`)
      .attr("transform", (person) => `translate(${person.x},${person.y})`)
      .call(
        d3
          .drag<SVGGElement, LayoutPerson>()
          .on("drag", function (event, person) {
            person.x = event.x;
            person.y = event.y;
            d3.select(this).attr("transform", `translate(${person.x},${person.y})`);
            redrawLinks();
          }),
      );

    personGroups.each(function (person) {
      const group = d3.select<SVGGElement, LayoutPerson>(this);
      drawPersonSymbol(group, person);
      group.append("text").attr("class", "person-name").attr("y", 54).text(person.name);
      const years = [person.birthYear, person.deathYear].filter(Boolean).join("-");
      if (years) group.append("text").attr("class", "person-years").attr("y", 72).text(years);

      person.roleLabels.slice(0, 3).forEach((label, index) => {
        const x = -PERSON_W / 2 + 10 + index * 30;
        group.append("rect").attr("class", "role-badge").attr("x", x).attr("y", -PERSON_H / 2 - 24).attr("width", 26).attr("height", 18).attr("rx", 4);
        group.append("text").attr("class", "role-badge-text").attr("x", x + 13).attr("y", -PERSON_H / 2 - 11).text(label);
      });

      group.append("title").text(`${person.name}${person.birthYear ? `, born ${person.birthYear}` : ""}`);
    });

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 2.6])
      .on("zoom", (event) => {
        root.attr("transform", event.transform.toString());
      });

    svg.call(zoom);
  }, [layout]);

  return <svg ref={svgRef} className="genogram-svg" aria-label="Rendered genogram diagram" />;
}

function linkPath(link: LayoutLink) {
  if (link.kind === "parentChild") {
    const midY = (link.source.y + link.target.y) / 2;
    return `M${link.source.x},${link.source.y} V${midY} H${link.target.x} V${link.target.y - PERSON_H / 2}`;
  }
  if (link.kind === "emotional") {
    const dx = link.target.x - link.source.x;
    const dy = link.target.y - link.source.y;
    const curve = Math.max(45, Math.hypot(dx, dy) * 0.18);
    return `M${link.source.x},${link.source.y} Q${(link.source.x + link.target.x) / 2},${(link.source.y + link.target.y) / 2 - curve} ${link.target.x},${link.target.y}`;
  }
  return `M${link.source.x},${link.source.y + PERSON_H / 2} L${link.target.x},${link.target.y}`;
}

function drawPersonSymbol(group: d3.Selection<SVGGElement, LayoutPerson, null, undefined>, person: LayoutPerson) {
  if (person.gender === "female") {
    group.append("circle").attr("class", "person-symbol").attr("r", 34);
    return;
  }
  if (person.gender === "male") {
    group.append("rect").attr("class", "person-symbol").attr("x", -34).attr("y", -34).attr("width", 68).attr("height", 68).attr("rx", 3);
    return;
  }
  if (person.gender === "nonbinary") {
    group.append("polygon").attr("class", "person-symbol").attr("points", "0,-39 39,0 0,39 -39,0");
    return;
  }
  group.append("circle").attr("class", "person-symbol unknown-symbol").attr("r", 34);
  group.append("text").attr("class", "unknown-mark").attr("y", 8).text("?");
}
