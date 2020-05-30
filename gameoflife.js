const field_size = 800;
const cells_in_row = 50;
const frames_per_second = 1;

var CLEAR_GRID = 0;
var TIMEOUT = null;
var LAST_GRID = null;
var STATE = 'playing';

var elem = document.getElementById('canvas'),
    elem_left = elem.offsetLeft + elem.clientLeft,
    elem_top = elem.offsetTop + elem.clientTop,
    context = elem.getContext('2d');
    elements = [];

class Square {
    constructor(x,y) {
        this.value = 0;  
        this.x = x;
        this.y = y;
        this.coordinates = [x*cell_size,y*cell_size];
    }

    fill() {
        this.value = 1;
    }
    clear() {
        this.value = 0;
    }

}

const get_circle_coordinates = (origin, radius) => {
    coordinates = [];

    let x0 = origin[0];
    let y0 = origin[1];
    
    f = 1 - radius;
    ddf_x = 1;
    ddf_y = -2 * radius;
    x = 0;
    y = radius;

    coordinates.push([x0, y0+radius],[x0, y0-radius],
                    [x0+radius, y0],[x0-radius, y0]);

    while (x < y) {
        if (f >= 0) {
            y -= 1;
            ddf_y += 2;
            f += ddf_y;

            x += 1;
            ddf_x += 2;
            f += ddf_x;

            coordinates.push(
                [x0+x, y0+y],
                [x0-x, y0+y],
                [x0+x, y0-y],
                [x0-x, y0-y],
                [x0+y, y0+x],
                [x0-y, y0+x],
                [x0+y, y0-x],
                [x0-y, y0-x]        
                )
        }
        console.log("running");
    }

    return coordinates;
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
    let island_coords = [];
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid.length; j++) {
            if (visited[i][j] === false && grid[i][j].value === 1) {
                // visit all cells in this island and increment island count
                // dfs will return array of coordinates of island
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
            grid[i][j] = new Square(i,j);
            v = 0;
            if (random) {
                v = Math.floor(Math.random() * 2);
            } 
            grid[i][j].value = v;
        }
    }
    return grid;
}

const get_next_generation = (grid) => {
    const next_grid = new Array(grid.length);
    for (let i = 0; i < grid.length; i++) {
        next_grid[i] = new Array(grid.length);
        for (let j = 0; j < grid.length; j++) {
            next_grid[i][j] = new Square(i,j);
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

const cell_stroke_color = '#aaa'
const cell_size = field_size / cells_in_row;

const draw_grid = (ctx, grid) => {
    ctx.strokeStyle = cell_stroke_color;
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid.length; j++) {
            const value = grid[i][j].value;
            
            if (value) {
                ctx.fillRect(
                    i * cell_size,
                    j * cell_size,
                    cell_size,
                    cell_size
                )
            }            
            ctx.strokeRect(
                i * cell_size,
                j * cell_size,
                cell_size,
                cell_size,
            )
        }
    }
}


const generation = (ctx, grid) => {
    ctx.clearRect(0,0,field_size,field_size);
    draw_grid(ctx, grid);
    LAST_GRID = grid;
    next_grid_generation = get_next_generation(grid);
    TIMEOUT = setTimeout(() => {
        requestAnimationFrame(() => generation(ctx, next_grid_generation))
    }, 1000 / frames_per_second)
}

var clear_button = document.getElementById("clear");
clear_button.onclick = () => {
    console.log("Clearing Board");
    if (TIMEOUT != null) {
        clearTimeout(TIMEOUT);
        TIMEOUT = null;
    }
    const ctx = canvas.getContext('2d');
    const grid = get_new_grid();
    ctx.clearRect(0,0,field_size,field_size);
    draw_grid(ctx, grid);
    LAST_GRID = grid;
};

var play_button = document.getElementById("play");
play_button.onclick = () => {
    if (STATE == 'pause') {
        console.log("Playing");
        const ctx = canvas.getContext('2d');
        const grid = LAST_GRID;     
        STATE = 'playing';
        generation(ctx, grid);
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

var debug_button = document.getElementById("debug_button");
debug_button.onclick = () => {
    console.log("Debug Button");
    // console.log(get_circle_coordinates([25,25], 2));
}

canvas.addEventListener('click', function() {
    var x = event.pageX - elem_left,
        y = event.pageY - elem_top;
    
    console.log('Clicked ', x, ',', y);
    console.log(LAST_GRID);
}, false)

window.onload = () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const grid = get_new_grid(random = 1);
    generation(ctx, grid);
}