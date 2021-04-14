(() => {
    let td = document.getElementsByTagName('td');
    let turn = document.getElementsByClassName('turn')[0];
    let socket = io();
    let pos = {
        mine : Array(9).fill(0),
        opponent : Array(9).fill(0)
    }
    let urTurn = false;
    let char = {
        my : null,
        opponent : null
    }
    let id = null;

    let setScreenSize = () => {
        document.documentElement.style.setProperty('--bodyHeight', `${window.innerHeight}px`)
    }

    setScreenSize();


    let gameOver = decision => {
        pos.mine = Array(9).fill(0);
        pos.opponent = Array(9).fill(0);

        urTurn = false;

        char.my = null;
        char.opponent = null;

        document.getElementsByClassName('gameOver')[0].style.display = 'flex';
        document.getElementsByClassName('decision')[0].innerHTML = decision;
        document.getElementsByClassName('turn')[0].innerHTML = '';
    }

    socket.on('user joined', data => {
        if(data) { // Checks if you start
            urTurn = true;
            char.my = 'X';
            char.opponent = 'O';
            turn.innerHTML = 'Your Turn';
        } else {
            char.my = 'O';
            char.opponent = 'X';
            turn.innerHTML = 'Opponents Turn';
        }
    })

    socket.on('id', data => {
        id = data; // Recieving opponents id
    })

    socket.on('won', () => {
        gameOver('won');
    })

    socket.on('lost', () => {
        gameOver('lost');
    })

    socket.on('draw', () => {
        gameOver('draw');
    })

    socket.on('play', data => {

        pos.opponent[data] = 1; // Marking played spot

        td[data].innerHTML = char.opponent;
        urTurn = true;
        
        turn.innerHTML = 'Your Turn';

    })

    for(let i = 0; i < td.length; i++) {
        td[i].addEventListener('click', function(x) {

            if(!urTurn) {
                return false;
            }

            let playPos = x.target.id; // Gets id of clicked box

            
            if(pos.mine[playPos] || pos.opponent[playPos]) { // Checks if spot is already taken 
                return false;
            }


            pos.mine[playPos] = 1; 

            socket.emit('play', {pos : playPos, id : id}); // Sends play to opponent

            td[playPos].innerHTML = char.my;
            urTurn = false;

            turn.innerHTML = 'Opponents Turn';
        })
    }

    document.getElementById('findNext').addEventListener('click', () => {
        socket.emit('find new');

        for(let i = 0; i < td.length; i++) {
            td[i].innerHTML = '';
        }

        document.getElementsByClassName('gameOver')[0].style.display = 'none';
        document.getElementsByClassName('turn')[0].innerHTML = 'Finding Opponent...';
    })

})();
