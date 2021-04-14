let express = require('express')
let app = express();

let http = require('http').createServer(app); 
let io = require('socket.io')(http);

let pendingUsers = [];
let players = {};


let newPlayer = (id, opponent, turn) => {
    if(players[id]) {
        players[id].opponent = opponent;
        players[id].isTurn = turn;
        // players[id].positions = [0,0,0,0,0,0,0,0,0];
        players[id].positions = Array(9).fill(0);

    } else {
        players[id] = {
            opponent : opponent,
            isTurn : turn,
            // positions : [0,0,0,0,0,0,0,0,0],
            positions : Array(9).fill(0),
            intervalId : null,
            count : function() {
                
                // let id = setTimeout(() => {
                //     gameOver(this.opponent, players[this.opponent].opponent);
                // }, 6000)

                this.intervalId = setTimeout(() => {
                    gameOver(this.opponent, players[this.opponent].opponent);
                }, 6000);
            }
        }
    }
    
}


let win = [
    "012",
    "345",
    "678",
    "036",
    "147",
    "258",
    "048",
    "246"
];

let countSpots = arr => arr.reduce((acc, item) => acc + item);


let checkWin = arr => {
    for(let a = 0; a < win.length; a++) {
        if(!arr[win[a][0]]) continue;
        if(!arr[win[a][1]]) continue;
        if(!arr[win[a][2]]) continue;

        return true;
    }
}

let remove = player => {
    if(player) {
        player.opponent = null,
        player.isTurn = false,
        player.positions = [0,0,0,0,0,0,0,0,0]
    }
}

let gameOver = (winner, loser, draw = false) => {
    
    if(players[winner]) clearTimeout(players[winner].intervalId);
    if(players[loser]) clearTimeout(players[loser].intervalId);
    
    if(!draw) {
        io.to(winner).emit('won');
        io.to(loser).emit('lost');
    } else {
        io.to(winner).emit('draw');
        io.to(loser).emit('draw');
    }
    
    remove(players[winner]);
    remove(players[loser]);

}



io.on('connection', socket => {
    io.to(socket.id).emit('id', socket.id);

    let pair = () => {
        if(pendingUsers.length > 0) { // If There is user waiting tries to connect to eachother 
            let user = pendingUsers.shift(); // Gets pending users id and removes from pendings
            
            
            newPlayer(user, socket.id, false);
            newPlayer(socket.id, user, true);
            
            io.to(socket.id).emit('user joined', true); // sends id-s of conencted users
            io.to(user).emit('user joined', false); // to each other
            
            // players[socket.id].count();
        } else { //if there is no user waiting he will be added to pending
            pendingUsers.push(socket.id);
        }
    }
 
    pair();

    socket.on('play', data => {
    
        let player = players[data.id];
        let opponent = players[player.opponent];
         

        if(!player.isTurn) {
            console.log('not ur turn');   
            return false;
        }
        
        if(player.positions[data.pos]) {
            console.log('position taken');   
            return false;
        }
    
        clearTimeout(player.intervalId);

        player.positions[data.pos] = 1;

        player.isTurn = false;

        let didWin = () => {
            // At least 3 plays needed for win
            if(countSpots(player.positions) < 3) return false;

            if(checkWin(player.positions)) {
                gameOver(data.id, player.opponent);
                
                return true;
            }
            
            // if(countSpots(player.positions) + countSpots(opponent.positions) == 9) {
            //     gameOver(data.id, player.opponent, true);
            
            //     return true;
            // } 

            if([...player.positions, ...opponent.positions].reduce((acc, item) => acc + item) == 9) {
                gameOver(data.id, player.opponent, true);
            
                return true;
            } 
        }

        if(didWin()) return true;

        opponent.isTurn = true;
        
        io.to(player.opponent).emit('play', data.pos);        
    })

    socket.on('find new', () => {
        pair();
    })

    socket.on('disconnect', () => {

        if(players[socket.id]) { // If user was paired send opponent game over event
            gameOver(players[socket.id].opponent, socket.id);

            delete players[socket.id];
        } else { // If user wasn't paired delete from pendings
            let pendingId = pendingUsers.indexOf(socket.id);

            if(pendingId != -1) pendingUsers.splice(pendingId, 1);
        }
    })
})  


app.use(express.static(__dirname + '/public'))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
})

http.listen(process.env.PORT || 3000, () => console.log('Running Server'))