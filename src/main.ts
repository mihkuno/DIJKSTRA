import p5 from 'p5';

const sketch = (p: p5) => {

    type Tree = {[key: string]: string[]};      
    type Node = {x: number, y: number, radius: number, label: string};
    type Edge = {
        lb1: string, x1: number, y1: number, 
        lb2: string, x2: number, y2: number, 
        d: number, xm: number, ym: number
    };
    type Record = {
        [node: string]: {
          distance: number;
          previous: string;
        };
    };

    const drawNode = (n: Node, target: string): void => {
        const {x, y, radius, label} = n;
        p.strokeWeight(1);
        p.stroke('#535c68');
        p.fill('#3ae374');

        if (label == 'E' || label == 'S')
            p.fill('#7d5fff');
        
        if (label == target)
            p.fill('#ffb142')
        
        p.circle(x, y, radius);
        p.fill(10);
        p.textSize(11);
        p.text(label, x-4, y+5);
    }

    const drawEdge = (e: Edge, highlight?: Edge[], attach?: Edge[]): void => {
        const {lb1, lb2, x1, y1, x2, y2, d, xm, ym} = e;

        p.strokeWeight(1);
        p.stroke(125);
   
        highlight?.forEach(f => {
            if (
                (f?.lb1 == lb1 || f?.lb1 == lb2) 
                && 
                (f.lb2 == lb1 || f?.lb2 == lb2)
            ) {
                p.strokeWeight(2);
                p.stroke('#778beb');
            }
        });

        attach?.forEach(c => {
            if (
                (c?.lb1 == lb1 || c?.lb1 == lb2) 
                && 
                (c.lb2 == lb1 || c?.lb2 == lb2)
            ) {
                p.strokeWeight(2);
                p.stroke('#ffa801');
            } 
        });
        
        p.line(x1, y1, x2, y2);
        p.strokeWeight(6);
        p.point(xm, ym);
        
        p.noStroke();
        p.fill(150);
        p.textSize(10);
        p.text(d, xm + 8, ym);
    }

    const drawMargin = (val: number): void => {
        p.fill(255);
        p.stroke(0);
        p.strokeWeight(1);
        p.square(val,val,5);
        p.square(val, p.windowHeight-val, 5);
        p.square(p.windowWidth-val,val,5);
        p.square(p.windowWidth-val,p.windowHeight-val,5);
    }
    
    // let tree: Tree = {
    //     S: ['A', 'B'],
    //     A: ['S', 'B'],
    //     B: ['A', 'C', 'S', 'D'],
    //     C: ['B', 'E', 'D'],
    //     D: ['E', 'B', 'C'],
    //     E: ['C', 'D']
    // }

    const tree: Tree = {
        S: ['A', 'B'],
        A: ['S', 'B', 'D'],
        B: ['A', 'C', 'D', 'H', 'S'],
        C: ['B', 'G'],
        D: ['B', 'F', 'A'],
        F: ['D', 'H'],
        H: ['B', 'F', 'G', 'I'],
        G: ['H', 'E', 'C'],
        I: ['K', 'H'],
        K: ['I', 'E'],
        E: ['G', 'K']
    }

    const initialTargetNode = 'S'
    const finalTargetNode = 'E';

    let nodes: Node[] = [];
    let edges: Edge[] = [];

    let highlight: Edge[] = [];
    let attach: Edge[] = [];

    let record: Record = {};
    let visited_nodes: string[] = [];
    let unvisited_nodes: string[] = [];

    let count_draw_nodes = 0;
    let count_draw_edges = 0;
    let count_target_neighbor = 0;

    let targetNode: string;
    let targetBranch: string[];

    let dijkstraSearchComplete = false;
    let currentEdgeLink = finalTargetNode;
    let previousEdgeLink = '';

    p.setup = (): void => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.frameRate(12);

        const radius = 40;
        const margin = 50;
        
        let x = 0, y = 0;

        unvisited_nodes = Object.keys(tree);
        
        console.log('generating vertices...');
        for (let n = 0; n < unvisited_nodes.length; n++) {
            let reset;
            let count = 0;

            /* very slow prevents a node from covering a line */
            do {
                reset = false;

                if (count > 1000) {
                    reset = true;
                    nodes = [];
                    n = -1;
                    break;    
                }

                x = Math.floor(p.random(margin, p.windowWidth - margin));
                y = Math.floor(p.random(margin, p.windowHeight - margin));
            
                for (let n1 in nodes) {
                    if (reset) break;
                    for (let n2 in nodes) {

                        if (n1 == n2) continue;

                        const x1 = nodes[n1].x;
                        const y1 = nodes[n1].y;
                        const x2 = nodes[n2].x;
                        const y2 = nodes[n2].y;
                        
                        const m = (y2 - y1) / (x2 - x1);
                        const yn = m * (x - x1) + y1;
                        const xn = (y - y1 + x1 * m) / m;

                        if (
                            (x <= xn + (radius * 2) && x >= xn - (radius * 2)) ||
                            (y <= yn + (radius * 2) && y >= yn - (radius * 2))
                        ) {
                            reset = true;
                            break;
                        }
                    }
                }
                count++;
            } while (reset);

            if (reset) {
                continue;
            };

            const node: Node = {x, y, radius, label: unvisited_nodes[n]};
            nodes.push(node);
        }
        console.log(tree);


        console.log('linking network..');
        let linked: string[] = [];
        for (const key in tree) {
            const start = nodes.findIndex((node) => node.label == key);
            for (const link of tree[key]) {
                const end = nodes.findIndex((node) => node.label == link);

                if (!linked.includes(link)) {
                    const n1 = nodes.at(start);
                    const n2 = nodes.at(end);

                    const x1 = n1!.x;
                    const y1 = n1!.y;
                    const x2 = n2!.x;
                    const y2 = n2!.y;
                    const d = Math.floor(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)));
                    
                    const xm = ((x1 + x2) / 2);
                    const ym = ((y1 + y2) / 2);

                    edges.push({
                        d, xm, ym,
                        lb1: key, x1, y1, 
                        lb2: link, x2, y2
                    });
                }
            }
            linked.push(key);
        }
        console.log(edges);

        console.log('rendering..');
    };

    p.draw = (): void => {
        p.background(10);

        if (count_draw_nodes < nodes.length) 
            count_draw_nodes++; 

        if (count_draw_edges < edges.length) 
            count_draw_edges++;
        
        for (let e = 0; e < count_draw_edges; e++) 
            drawEdge(edges[e], highlight, attach);

        for (let n = 0; n < count_draw_nodes; n++) 
            drawNode(nodes[n], targetNode);

        // if done rendering 
            // if unvisited is not empty
                // if visited is empty
                    // select starting target node
                    // select branch of target node
                    // record starting with a distance of 0

                // otherwise if first branch to evaluate
                    // find the shortest distance in the record skip visited
                    // select as new target node
                    // select branch of target node
                    // remove neighbors from branch if visited

                // look into target node branch
                // if branch has neighbors
                    // find the neighbor edge
                    // calculate neighbor distance + distance of target node

                    // if neighbor in record
                        // if calculated is less than existing record
                            // record neighbor distance + distance of target node
                            // record target node as the previous node
                    // otherwise    
                        // record neighbor distance + distance of target node
                        // record target node as the previous node

                // if no more neighbor in branch
                    // add target node to visited    
                    // remove target node from unvisited

                    
        const isRenderFinished = (
            count_draw_nodes == nodes.length && count_draw_edges == edges.length);

        if (isRenderFinished) {
            if (unvisited_nodes.length != 0) {
                if (Object.keys(record).length == 0) {
                    targetNode = initialTargetNode;
                    targetBranch = tree[targetNode];
                    record[initialTargetNode] = {distance: 0, previous: ''};
    
                    console.log('init', targetNode);
                }
                else if (count_target_neighbor == 0) {
                    let minDistance = Infinity;
                    let minDistanceKey: string;
    
                    for (const node in record) {
                        if (unvisited_nodes.includes(node)) {
                            const distance = record[node].distance;
                            if (distance < minDistance) {
                                minDistance = distance;
                                minDistanceKey = node;
                            }
                        }
                    }
                    targetNode = minDistanceKey!;
                    console.log('next', targetNode);
    
                    targetBranch = [];
                    for (const n of tree[targetNode]) {
                        if (unvisited_nodes.includes(n)) 
                            targetBranch.push(n);
                    }
                }
                
                // console.log('eval', targetNode);
    
                if (targetBranch.length > 0) {
                    let targetNeighbor = targetBranch[count_target_neighbor++];
                    let edgeLink: Edge;
                    let edgeDistance = 0;

                    for (const e of edges) {
                        let edgeOfTarget = '', edgeOfNeighbor = '';

                        if (e.lb1 == targetNode) 
                            edgeOfTarget = e.lb1;
                        else if (e.lb2 == targetNode)
                            edgeOfTarget = e.lb2;
                        if (e.lb1 == targetNeighbor)
                            edgeOfNeighbor = e.lb1;
                        else if (e.lb2 == targetNeighbor)
                            edgeOfNeighbor = e.lb2;
                        if (edgeOfTarget != '' && edgeOfNeighbor != '') {
                            edgeDistance = e.d;
                            edgeLink = e;
                            break;
                        }
                    }

                    highlight.push(edgeLink!);
    
                    const distance = edgeDistance + record[targetNode].distance;
    
                    if (targetNeighbor in record) {
                        const distanceInRecord = record[targetNeighbor].distance;
                        if (distance < distanceInRecord) {
                            record[targetNeighbor] = {distance, previous: targetNode};
                        }                
                    }
                    else {
                        record[targetNeighbor] = {distance, previous: targetNode};
                    }
                }
    
                if (count_target_neighbor >= targetBranch.length) {
                    count_target_neighbor = 0;
                    visited_nodes.push(targetNode);
                    unvisited_nodes.splice(unvisited_nodes.indexOf(targetNode), 1);

                    // when search is complete 
                    if (unvisited_nodes.length == 0) {                        
                        console.log(record);
                        highlight = [];
                        dijkstraSearchComplete = true;
                    }
                }
            }    
            else if (dijkstraSearchComplete) {
                targetNode = '';

                previousEdgeLink = currentEdgeLink;
                currentEdgeLink = record[currentEdgeLink].previous;
                
                let edgeLink: Edge;
                
                for (const e of edges) {
                    let edgeOfCurrent = '', edgeOfPrevious = '';
                    
                    if (e.lb1 == currentEdgeLink) 
                        edgeOfCurrent = e.lb1;
                    else if (e.lb2 == currentEdgeLink)
                        edgeOfCurrent = e.lb2;
                    if (e.lb1 == previousEdgeLink)
                        edgeOfPrevious = e.lb1;
                    else if (e.lb2 == previousEdgeLink)
                        edgeOfPrevious = e.lb2;
                    if (edgeOfCurrent != '' && edgeOfPrevious != '') {
                        edgeLink = e;
                        break;
                    }
                }

                attach.push(edgeLink!);

                if (currentEdgeLink == initialTargetNode) {
                    dijkstraSearchComplete = false;
                }
            }
        }
        
    };
};

const app: HTMLDivElement = document.querySelector('#app')!;
new p5(sketch, app);


