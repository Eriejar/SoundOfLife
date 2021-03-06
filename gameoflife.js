const field_size = 800;
const cells_in_row = 64;
var frames_per_second = 1;

const cell_stroke_color = '#aaa'
const cell_size = field_size / cells_in_row;

var CLEAR_GRID = 0;
var TIMEOUT = null;
var LAST_GRID = null;
var NEXT_GRID = null;
var STATE = 'playing';
var MOUSE_DOWN = false;

var RING;


var elem = document.getElementById('canvas'),
    elem_left = elem.offsetLeft + elem.clientLeft,
    elem_top = elem.offsetTop + elem.clientTop,
    context = elem.getContext('2d');
    elements = [];

class Cell {
    constructor(x,y) {
        this.value = 0;  
        this.x = x;
        this.y = y;
        this.coordinates = [x*cell_size,y*cell_size];
        this.draw_cell = null;
        this.color = 'black';
    }

    fill() {
        this.value = 1;
    }
    clear() {
        this.value = 0;
    }

}

class Note {
    constructor(position) {
        this.position = position;
        this.instrument = null;
        this.pitch = getRandomNote();

        let mapped_location_x = (this.position[0] / cells_in_row) * 3000 - 1500;
        let mapped_location_z = (this.position[1] / cells_in_row * 3000 - 1500) * -1;
        this.location = [mapped_location_x, mapped_location_z];
    }
}

const get_islands = (grid) => {
    // bool array to mark visited cells
    let visited = new Array(cells_in_row);
    for (let i = 0; i < grid.length; i++) {
        visited[i] = new Array(cells_in_row);
        for (let j = 0; j < grid[0].length; j++) {
            visited[i][j] = false;
        }
    }

    
    let count = 0;
    let islands = [];
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid.length; j++) {
            if (visited[i][j] == false && grid[i][j].value == 1) {
                // visit all cells in this island and increment island count
                // dfs will return array of coordinates of island
                let island_coords = new Array();
                [visited, island_coords]  = dfs(i, j, grid, visited, island_coords);
                islands.push(island_coords);
                count += 1;         
            }
        }
    }
    return [count, islands];
}

const is_safe = (i, j, grid, visited) => {
    return (i >= 0 && i < grid.length &&
            j >= 0 && j < grid.length &&
            !(visited[i][j]) && grid[i][j].value === 1);
}

const trigger_island_sound = (island) => {

    let parsed_island = parse_island(island);
    let notes_to_be_played = new Array(parsed_island.length);
    console.log(notes_to_be_played);
    let sounds = ['Kick', 'Snare', 'Closed Hat', 'Open Hat', 'Clink', 'Snap'] // mappings to rows
    for (let i = 0; i < parsed_island.length; i++) { // columns
        notes_to_be_played[i] = [];
        for (let j = 0; j < parsed_island[0].length; j++) { // rows
            for (const note of parsed_island[i][j]) {
                if (j > sounds.length - 1) {
                    note.instrument = null;
                }
                else {        
                    note.instrument = sounds[j];
                    //note.instrument = `Clink`;
                }
                console.log(note);
                notes_to_be_played[i].push(note);
            }
        }
    }

    sequencer(notes_to_be_played);
}

const parse_island = (island) => {
    let top_layer = Math.min(...island.map(function(ele) { return ele[1]}));
    let bottom_layer = Math.max(...island.map(function(ele) { return ele[1]}));
    let first_column = Math.min(...island.map(function(ele) { return ele[0]}));
    let last_column = Math.max(...island.map(function(ele) { return ele[0]}));

    let height = bottom_layer - top_layer + 1;
    let width = last_column - first_column + 1;
    let parsed = new Array(width);
    let cells;
    let col = 0;
    for (let i = first_column; i <= last_column; i++) {
       cells = island.filter(function(ele) {return (ele[0] == i)});
       parsed[col] = new Array(height); // row size
       let row = 0;

       let temp;
       for (let j = bottom_layer; j >= top_layer; j--) {
           temp = cells.filter(function(ele) {return (ele[1] == j)});
           parsed[col][row] = temp.map(function(ele) {
               
                return new Note(ele)});
           row += 1;
       }
       col += 1;
    }
    return parsed;
}

const destroy_islands = (grid, islands) => {
    
    

    if (islands == undefined) {
        return;
    }
    for (const island of islands) {
        for (const coord of island) {
            grid[coord[0]][coord[1]].value = 0;
        }
        // let the sound commence!
        trigger_island_sound(island);
    }
    return;
}

const dfs = (i, j, grid, visited, island_coords) => {
    let row_nbr = [-1, -1, -1, 0, 0, 1, 1, 1];
    let col_nbr = [-1, 0, 1, -1, 1, -1, 0, 1];

    visited[i][j] = true;
    island_coords.push([i,j]);
    for (let k = 0; k < 8; k++) {
        if (is_safe(i + row_nbr[k], j + col_nbr[k], grid, visited)) {
            [visited, island_coords] = dfs(i + row_nbr[k], j + col_nbr[k], grid, visited, island_coords);
        }
    }

    return [visited, island_coords];
}


const get_new_grid = (random = 0) => {
    const grid = new Array(cells_in_row);
    for (let i = 0; i < grid.length; i++) {
        grid[i] = new Array(cells_in_row);
        for (let j = 0; j < grid.length; j++) {
            grid[i][j] = new Cell(i,j);
            v = 0;
            if (random) {
                v = Math.floor(Math.random() * 2);
            } 
            grid[i][j].value = v;
            grid[i][j].draw_cell = new paper.Path.Rectangle(i*cell_size, j*cell_size, cell_size, cell_size);
            grid[i][j].draw_cell.strokeColor = 'black';
        }
    }
    return grid;
}

const get_next_generation = (grid) => {

    let next_grid = new Array(grid.length);
    for (let i = 0; i < grid.length; i++) {
        next_grid[i] = new Array(grid.length);
        for (let j = 0; j < grid.length; j++) {
            next_grid[i][j] = new Cell(i,j);
            const value = grid[i][j].value;
            const neighbors = count_neighbors(grid, i, j);
            if (value === 0 && neighbors === 3) {
                next_grid[i][j].fill(); // alive
            }
            else if (value === 1 &&
                    (neighbors < 2 || neighbors > 3)) {
                next_grid[i][j].clear(); // dead
            }
            else {
                next_grid[i][j].value = value; // same
            }
            next_grid[i][j].draw_cell = grid[i][j].draw_cell;
        }
    }

    return next_grid;
}

const count_neighbors = (grid,x,y) => {
    let sum = 0;
    const number_of_rows = grid.length;
    const number_of_cols = grid[0].length;
    for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
            const row = (x+i+number_of_rows) % number_of_rows;
            const col = (y+j+number_of_cols) % number_of_cols;
            sum += grid[row][col].value;
        }
    }
    sum -= grid[x][y].value;

    return sum;
}


const draw_grid = (grid, ring) => {

    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid.length; j++) {
            const value = grid[i][j].value;
            if (value) {
                grid[i][j].draw_cell.fillColor = grid[i][j].color;
            } 
            else {
                grid[i][j].draw_cell.fillColor = 'white';
            }
        }
    }
    paper.view.draw();
}



const check_intersections = (grid) => {
    var island_count, islands;
    [island_count, islands] = get_islands(grid);

    var intersect_count = 0;
    var intersecting_islands = [];
    for (var island of islands) {
        for (var coord of island) {
            var cell = grid[coord[0]][coord[1]];
            if (cell.value && RING.intersects(cell.draw_cell)) {
    
                // painting island orange (about to be destroyed)
                for (var coord of island) {
                    grid[coord[0]][coord[1]].color = 'orange';
                }    
                // triggering cell is painted red for debugging
                cell.color = 'red';

                intersecting_islands.push(island);
                intersect_count += 1;
                break;
            }
            else {
                cell.color = 'black'
            }
        }
    }

    return intersecting_islands;
}


const load_seed = () => {
    let origin = [32,32];
    let seed = `
........................O
......................O.O
............OO......OO............OO
...........O...O....OO............OO
OO........O.....O...OO
OO........O...O.OO....O.O
..........O.....O.......O
...........O...O
............OO`

    let split_seed = seed.split('\n');
    let columns = 0;
    for (const line of split_seed) {
        if (columns < line.length) {
            columns = line.length;
        }
    }
    let rows = split_seed.length;

    let top_left = [( origin[0] - Math.floor(rows/2) ) , ( origin[1] - Math.floor(columns/2) )]
    console.log(top_left);
    if (top_left[0] < 0) {
        top_left[0] = 0;
    }
    if (top_left[1] < 0) {
        top_left[1] = 0;
    }

    let i = top_left[0];
    let j = top_left[1];
    for (const line of split_seed) {
        j = top_left[1];
        for (const c of line) {
            if (c == 'O') {
                NEXT_GRID[j][i].value = 1;
            }
            j++;
        }
        i++;
    }

    console.log(split_seed);
}

const generation = () => {
    RING = new paper.Path.Circle(new paper.Point(field_size/2, field_size/2), field_size/2*.9);
    RING.strokeColor = 'blue';
    RING.strokeWidth = 4;

    var intersecting_islands = check_intersections(NEXT_GRID);

    draw_grid(NEXT_GRID, RING);
    
    // destroying intersecting islands after displaying
    //playSample('Kick', 'C4');
    destroy_islands(NEXT_GRID, intersecting_islands);

    NEXT_GRID = get_next_generation(NEXT_GRID);

    

    TIMEOUT = setTimeout(() => {
        requestAnimationFrame(() => generation())
    }, 1000 / frames_per_second)
}

var clear_button = document.getElementById("clear");
clear_button.onclick = () => {
    console.log("Clearing Board");
    STATE = 'pause';
    if (TIMEOUT != null) {
        clearTimeout(TIMEOUT);
        TIMEOUT = null;
    }
    
    NEXT_GRID = get_new_grid();
    draw_grid(NEXT_GRID);
};

var play_button = document.getElementById("play");
play_button.onclick = () => {
    if (STATE == 'pause') {
        console.log("Playing");
        STATE = 'playing';
        generation();
    }
}

var pause_button = document.getElementById("pause");
pause_button.onclick = () => {
    console.log("Pausing");
    STATE = 'pause';
    if (TIMEOUT != null) {
        clearTimeout(TIMEOUT);
        TIMEOUT = null;
    }    
}

/*
var debug_button = document.getElementById("debug_button");
debug_button.onclick = () => {
    console.log("Debug Button");
    // console.log(get_circle_coordinates([25,25], 2));
} */

canvas.addEventListener('click', function() {
    var x = event.pageX - elem_left,
        y = event.pageY - elem_top;
    
    //console.log('Clicked ', x, ',', y);
    var square_coord = [Math.floor(x / cell_size), Math.floor(y / cell_size) ]
    //console.log(square_coord);
    //console.log(NEXT_GRID[square_coord[0]][square_coord[1]]);

    var cell = NEXT_GRID[square_coord[0]][square_coord[1]];
    cell.value = 1;
    cell.draw_cell.fillColor = 'black';
    

    paper.view.draw();
    

}, false)

canvas.onmousedown = function (event) {
    MOUSE_DOWN = true;
}

canvas.onmousemove = function (event) {
    if (MOUSE_DOWN) {
        var x = event.pageX - elem_left,
            y = event.pageY - elem_top;
        var square_coord = [Math.floor(x / cell_size), Math.floor(y / cell_size) ]
        var cell = NEXT_GRID[square_coord[0]][square_coord[1]];
        cell.value = 1;
        cell.draw_cell.fillColor = 'black';
    }
}

canvas.onmouseup = function (event) {
    MOUSE_DOWN = false;
}

var slider = document.getElementById("speedSlider");
var output = document.getElementById("updateRate");
output.innerHTML = slider.value;

slider.oninput = function() {
    output.innerHTML = slider.value;
    frames_per_second = slider.value;
}

window.onload = () => {
    const canvas = document.getElementById('canvas');
    
    paper.setup(canvas);
    RING = new paper.Path.Circle(new paper.Point(field_size/2, field_size/2), 200);
    RING.fillColor = 'black';
    const grid = get_new_grid(random = 0);
    NEXT_GRID = grid;
    load_seed();
    generation();

    start_audio_system();
}