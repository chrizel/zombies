var game = null;

var InputHandler = Backbone.Model.extend({
    pressedKeys: [],

    initialize: function() {
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

var Object = Backbone.Model.extend({

    isCollider: true,

    initialize: function(x, y, width, height) {
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

        game.addObject(this);
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

    go: function(speed) {
        var xOffset = Math.sin(this.rad) * speed;
        var yOffset = Math.cos(this.rad) * speed;
        this.position(this.x-xOffset, this.y+yOffset);
    },

    collider: function() {
        var self = this;
        var result = null;
        _.each(game.objects, function(object) {
            if (object != self && self.collidesWith(object)) {
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

var Zombie = Object.extend({
    lastDamage: 0,
    damageSpeed: 1000,

    initialize: function() {
        Object.prototype.initialize.call(this, 48, 0, 48, 32);
        this.health = 50;
    },

    frame: function() {
        var p = game.player;
        var a = p.x - this.x;
        var b = p.y - this.y;
        var c = Math.sqrt(a*a+b*b);

        var alpha = Math.acos((a*a-b*b-c*c) / (-2*b*c)) * (a > 0 ? -1 : 1);

        this.rotation(alpha);
        if (c > 16)
            this.go(2);

        this.setSprite(48, 0);

        if (this.collidesWith(game.player)) {
            var now = (new Date()).getTime();
            if (now-this.lastDamage > this.damageSpeed) {
                game.player.damage(5);
                this.lastDamage = now;
            }
        }
    },

    damage: function(d) {
        this.health -= d;
        if (this.health < 0)
            game.removeObject(this);
        this.setSprite(48, 32);
    }
});

var Bullet = Object.extend({

    isCollider: false,

    initialize: function() {
        Object.prototype.initialize.call(this, 0, 16, 5, 5);
    },

    frame: function() {
        this.go(20);
        if (this.x < 0 || this.y < 0 || this.x > 800 || this.y > 600)
            game.removeObject(this);

        var collider = this.collider();
        if (collider && collider != game.player) {
            game.removeObject(this);
            if (collider.damage) {
                collider.damage(20);
            }
        }
    }
});

var Weapon = Object.extend({
    lastBullet: 0,
    speed: 100,
    isCollider: false,

    initialize: function() {
        Object.prototype.initialize.call(this, 0, 21, 5, 11);
    },

    shoot: function() {
        var now = (new Date()).getTime();
        if (now-this.lastBullet > this.speed) {
            var bullet = new Bullet();
            bullet.positionRelativeTo(this, 0, 10);
            this.lastBullet = now;
        }
    }

});

var Player = Object.extend({
    KEY_LEFT: 65,
    KEY_RIGHT: 68,
    KEY_UP: 87,
    KEY_DOWN: 83,
    KEY_FIRE: 32,

    initialize: function() {
        Object.prototype.initialize.call(this, 0, 0, 48, 16);
        this.weapon1 = new Weapon();
        this.weapon2 = new Weapon();
        this.health = 100;
    },

    frame: function() {
        if (game.inputHandler.pressed(this.KEY_UP)) {
            this.go(8);
        }
        if (game.inputHandler.pressed(this.KEY_DOWN)) {
            this.go(-4);
        }
        if (game.inputHandler.pressed(this.KEY_LEFT)) {
            this.rotation(this.rad-0.2);
        }
        if (game.inputHandler.pressed(this.KEY_RIGHT)) {
            this.rotation(this.rad+0.2);
        }
        if (game.inputHandler.pressed(this.KEY_FIRE)) {
            this.weapon1.shoot();
            this.weapon2.shoot();
        }

        this.weapon1.positionRelativeTo(this, -20, 10, -0.1);
        this.weapon2.positionRelativeTo(this, 20, 10, 0.01);
    },

    damage: function(d) {
        this.health = Math.max(0, this.health-d);
        if (this.health < 1) {
            game.paused = true;
        }
    }
});

var Game = Backbone.Model.extend({

    KEY_PAUSE: 27,
    objects: [],
    paused: false,

    initialize: function() {
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
        var index = _.indexOf(this.objects, object);
        this.objects.splice(index, 1);
        $(object.div).remove();
    },

    frame: function() {
        _.each(this.objects, function(object) {
            object.frame();
        });

        if (this.player)
            $('#hid').html('Health: ' + this.player.health);
    }
});

$(function() { 
    game = new Game(); 
    game.player = new Player();
    game.player.position(500, 500);
    (new Zombie()).position(250, 150);
    window.setInterval(function() {
        if (!game.paused)
            (new Zombie()).position(Math.random()*800, Math.random()*600);
    }, 1000);
});
