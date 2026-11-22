// SPEC: FR-005
package auth

// wordList holds exactly 256 short, child-safe words. Four of them plus a 3-digit number make a
// generated password (about 42 bits). Edit with care: the tests pin the count and the character set.
var wordList = [256]string{
	"cat", "dog", "fox", "owl", "bee", "ant", "bat", "hen",
	"cow", "pig", "ram", "yak", "emu", "elk", "ape", "cub",
	"lion", "bear", "wolf", "deer", "duck", "frog", "toad", "crab",
	"fish", "seal", "swan", "hawk", "dove", "lamb", "goat", "mule",
	"mole", "mouse", "horse", "zebra", "tiger", "panda", "koala", "otter",
	"camel", "llama", "sheep", "whale", "shark", "squid", "snail", "moth",
	"wasp", "finch", "robin", "quail", "raven", "eagle", "gecko", "bison",
	"hippo", "red", "blue", "green", "pink", "gold", "gray", "teal",
	"lime", "plum", "navy", "rose", "peach", "amber", "coral", "ivory",
	"mint", "sun", "moon", "star", "sky", "rain", "snow", "wind",
	"leaf", "tree", "pine", "oak", "fern", "moss", "rock", "sand",
	"wave", "lake", "pond", "sea", "hill", "cave", "dune", "reef",
	"cloud", "river", "field", "grass", "maple", "cedar", "kite", "drum",
	"bell", "boat", "ship", "sail", "cart", "bike", "tent", "lamp",
	"book", "pen", "map", "cup", "hat", "sock", "boot", "coat",
	"ring", "bag", "box", "key", "rope", "sled", "apple", "mango",
	"pear", "grape", "lemon", "melon", "berry", "bean", "rice", "corn",
	"nut", "pie", "cake", "soup", "tea", "jam", "bread", "honey",
	"toast", "happy", "brave", "calm", "kind", "bold", "swift", "quick",
	"bright", "sunny", "gentle", "jolly", "lucky", "merry", "quiet", "witty",
	"cozy", "zany", "proud", "shiny", "fuzzy", "bolt", "dash", "spark",
	"glow", "beam", "wing", "nest", "burrow", "acorn", "pebble", "marble",
	"ribbon", "button", "candle", "puzzle", "rocket", "comet", "planet", "piano",
	"flute", "harp", "banjo", "tune", "song", "dance", "paint", "brush",
	"chalk", "tulip", "daisy", "lily", "clover", "willow", "birch", "cactus",
	"bamboo", "sandy", "rocky", "misty", "windy", "stormy", "frosty", "breezy",
	"pixel", "robot", "gadget", "widget", "magnet", "cookie", "muffin", "noodle",
	"waffle", "lemur", "parrot", "puffin", "pigeon", "beetle", "spider", "turtle",
	"rabbit", "monkey", "donkey", "pony", "meadow", "forest", "island", "valley",
	"canyon", "jelly", "ginger", "pepper", "sugar", "cocoa", "north", "south",
	"east", "west", "down", "fast", "slow", "soft", "loud", "tiny",
	"huge", "long", "quest", "trail", "camp", "hike", "climb", "swim",
}
