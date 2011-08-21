var game = null;

var InputHandler = Class.extend({
    pressedKeys: [],

    init: function() {
        var self = this;

        $(window).keydown(function(e) {
            self.pressedKeys[e.keyCode] = true;
        });

        $(window).keyup(function(e) {
            self.pressedKeys[e.keyCode] = false;
        });
    },

    pressed: function(keyCode) {
        return this.pressedKeys[keyCode];
    }
});

var AudioManager = new (Class.extend({

    bufferSize: 8,
    sounds: [],
    cur: [],

    play: function(sound) {
        if (!this.sounds[sound]) {
            var array = new Array();
            for (var i = 0; i < this.bufferSize; i++) {
                array.push($('<audio>')
                    .attr('preload', 'auto')
                    .attr('autobuffer', 'autobuffer')
                    .append($('<source>').attr('src', sound))
                    .appendTo('body')[0]);
            }
            this.sounds[sound] = array;
            this.cur[sound] = 0;
        }

        this.sounds[sound][this.cur[sound] % this.bufferSize].play();
        this.cur[sound]++;
    }
}));

var Object = Class.extend({

    isCollider: true,
    isWall: false,
    isDead: false,

    init: function(x, y, width, height, skipAdd) {
        this.width = width;
        this.height = height;
        this.div = $('<div>')
                      .addClass('object')
                      .css({
                          'background-image': 'url(res.png)',
                          'background-position': '-' + x + 'px -' + y + 'px'
                      })
                      .width(width)
                      .height(height)
                      .appendTo('#screen');
        this.position(0, 0);
        this.rotation(0);

        if (!skipAdd)
            game.addObject(this);
    },

    onRemove: function() {
        $(this.div).remove();
        this.isDead = true;
    },

    setSprite: function(x, y) {
        $(this.div).css('background-position', '-' + x + 'px -' + y + 'px');
    },

    position: function(x, y) {
        this.x = x;
        this.y = y;
        $(this.div).css({
            left: x + 'px',
            top: y + 'px'
        });
    },

    rotation: function(rad) {
        this.rad = rad;
        $(this.div).css({
            '-webkit-transform': 'rotate('+rad+'rad)',
            '-moz-transform': 'rotate('+rad+'rad)'
        });
    },

    positionRelativeTo: function(object, x, y, angle) {
        var a = $V([object.x + object.width / 2, 
                       object.y + object.height / 2]);
        var b = $V([a.elements[0]+x, a.elements[1]+y]);

        var c = b.rotate(object.rad, a);

        this.position(c.elements[0]-(this.width/2), c.elements[1]-(this.height/2));
        this.rotation(object.rad + (angle || 0));
    },

    go: function(speed, checkCollision) {
        var xold = this.x;
        var yold = this.y;
        var xOffset = Math.sin(this.rad) * speed;
        var yOffset = Math.cos(this.rad) * speed;
        this.position(this.x-xOffset, this.y+yOffset);

        if (checkCollision && this.collider(true)) {
            this.position(xold, yold);
        }
    },

    collider: function(onlyWalls) {
        var self = this;
        var result = null;
        _.each(game.objects, function(object) {
            if (object != self && 
                (!onlyWalls || object.isWall) &&
                self.collidesWith(object)) {
                result = object;
            }
        });
        return result;
    },

    collidesWith: function(object) {
        var midx = this.x + this.width/2;
        var midy = this.y + this.height/2;
        return (object.isCollider &&
                midx >= object.x && midx <= object.x+object.width &&
                midy >= object.y && midy <= object.y+object.height);
    },

    frame: function() {
    }

});

var Brick = Object.extend({

    isWall: true,

    init: function() {
        this._super(96, 0, 16, 16);
    },

});

var Blood = Object.extend({

    isCollider: false,

    init: function() {
        this._super(16, 16, 16, 16, true);
        $(this.div).css('z-index', 50);
    },

});

var BloodStack = new (Class.extend({

    stack: [],
    max: 50,

    init: function() {
    },

    add: function(sender) {
        var b = new Blood();
        b.positionRelativeTo(sender, 0, 0);
        this.stack.push(b);
        if (this.stack.length > this.max) {
            game.removeObject(this.stack[0]);
            this.stack.splice(0, 1);
        }
    },

}));

var Zombie = Object.extend({
    lastDamage: 0,
    damageSpeed: 1000,

    init: function(target) {
        this._super(48, 0, 48, 32);
        this.health = 30;
        this.target = target || game.player;
    },

    frame: function() {
        if (this.target.isDead)
            this.target == game.player;

        var p = this.target;
        var a = p.x - this.x;
        var b = p.y - this.y;
        var c = Math.sqrt(a*a+b*b);

        var alpha = Math.acos((a*a-b*b-c*c) / (-2*b*c)) * (a > 0 ? -1 : 1);

        this.rotation(alpha + (-0.1 + Math.random() * 0.2));
        if (c > 16)
            this.go(2, true);

        this.setSprite(48, 0);

        if (this.collidesWith(this.target)) {
            var now = (new Date()).getTime();
            if (now-this.lastDamage > this.damageSpeed) {
                AudioManager.play('zombie.wav');
                this.target.damage(this, 5);
                this.lastDamage = now;
            }
        }
    },

    damage: function(sender, d) {
        BloodStack.add(this);
        this.health -= d;
        this.setSprite(48, 32);
        if (this.health < 0) {
            AudioManager.play('death.wav');
            game.removeObject(this);
        }
        //this.target = sender;
    }
});

var SuperZombie = Zombie.extend({

    init: function() {
        this._super();
        this.health = 100;
        this.weapon = new Weapon(1000, 1);
    },

    onRemove: function() {
        this._super();
        game.removeObject(this.weapon);
    },

    frame: function() {
        this._super();
        this.weapon.positionRelativeTo(this, -19, 18, -0.1);
        this.weapon.shoot(this);
    }

});

var Heart = Object.extend({

    init: function(owner, damage) {
        this._super(16, 32, 16, 16);
    },

    frame: function() {
        var collider = this.collider();
        if (collider) {
            if (collider.health) {
                AudioManager.play('heart.wav');
                collider.health += 20;
            }
            game.removeObject(this);
        }
    }

});

var Bullet = Object.extend({

    isCollider: false,

    init: function(owner, damage) {
        this._super(0, 16, 5, 5);
        this.owner = owner;
        this.damage = damage;
    },

    frame: function() {
        this.go(14, false);
        if (this.x < 0 || this.y < 0 || this.x > 800 || this.y > 600)
            game.removeObject(this);

        var collider = this.collider();
        if (collider && collider != this.owner) {
            if (collider.damage) {
                collider.damage(this.owner, this.damage);
            }
            game.removeObject(this);
        }
    }
});

var Weapon = Object.extend({
    lastBullet: 0,
    ammo: 999,
    isCollider: false,

    init: function(speed, damage) {
        this._super(0, 21, 5, 11);
        this.speed = speed;
        this.damage = damage;
    },

    shoot: function(owner) {
        var now = (new Date()).getTime();
        if (now-this.lastBullet > this.speed) {
            this.ammo = Math.max(0, this.ammo-1);
            if (this.ammo < 1) {
            } else {
                AudioManager.play('shoot.wav');
                var bullet = new Bullet(owner, this.damage);
                bullet.positionRelativeTo(this, 0, 10);
                this.lastBullet = now;
            }
        }
    }

});

var Player = Object.extend({
    KEY_LEFT: 65,
    KEY_RIGHT: 68,
    KEY_UP: 87,
    KEY_DOWN: 83,
    KEY_FIRE: 32,

    init: function() {
        this._super(0, 0, 48, 16);
        this.weapon = new Weapon(200, 20);
        this.health = 100;
    },

    frame: function() {
        if (game.inputHandler.pressed(this.KEY_UP)) {
            this.go(8, true);
        }
        if (game.inputHandler.pressed(this.KEY_DOWN)) {
            this.go(-4, true);
        }
        if (game.inputHandler.pressed(this.KEY_LEFT)) {
            this.rotation(this.rad-0.2);
        }
        if (game.inputHandler.pressed(this.KEY_RIGHT)) {
            this.rotation(this.rad+0.2);
        }
        if (game.inputHandler.pressed(this.KEY_FIRE)) {
            this.weapon.shoot(this);
        }

        this.weapon.positionRelativeTo(this, -15, 10, -0.1);
    },

    damage: function(sender, d) {
        AudioManager.play('hurt.wav');
        BloodStack.add(this);
        this.health = Math.max(0, this.health-d);
        if (this.health < 1) {
            AudioManager.play('gameover.wav');
            game.paused = true;
        }
    }
});

var Game = Class.extend({

    KEY_PAUSE: 27,
    objects: [],
    paused: false,

    init: function() {
        this.inputHandler = new InputHandler();
        var self = this;
        $(window).keydown(function(e) {
            if (e.keyCode == self.KEY_PAUSE)
                self.paused = !self.paused;
        });
        window.setInterval(function() { 
            if (!self.paused)
                self.frame(); 
        }, 30);
    },

    addObject: function(object) {
        this.objects.push(object);
    },

    removeObject: function(object) {
        object.onRemove();
        var index = _.indexOf(this.objects, object);
        if (index >= 0)
            this.objects.splice(index, 1);
    },

    frame: function() {
        _.each(this.objects, function(object) {
            object.frame();
        });

        if (this.player)
            $('#hid').html('Health: ' + this.player.health + ' / Ammo: ' + this.player.weapon.ammo);
    }
});

$(function() { 
    game = new Game(); 
    game.player = new Player();
    game.player.position(500, 50);

    AudioManager.play('music0.mp3');

    for (var i = 0; i < 48; i++) {
        (new Brick()).position(16+i*16, 16);
        (new Brick()).position(16+i*16, 560);
    }
    for (var i = 0; i < 33; i++) {
        (new Brick()).position(16, 32+i*16);
        (new Brick()).position(768, 32+i*16);
    }


    window.setInterval(function() {
        if (!game.paused) {
            AudioManager.play('item.wav');
            (new Heart()).position(32+Math.random()*700, 32+Math.random()*500);
        }
    }, 30000);
    window.setInterval(function() {
        if (!game.paused)
            (new Zombie()).position(32+Math.random()*700, 32+Math.random()*500);
    }, 2000);
    window.setInterval(function() {
        if (!game.paused && game.objects.length < 200)
            (new SuperZombie()).position(32+Math.random()*700, 32+Math.random()*500);
    }, 5000);
});
