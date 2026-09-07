/** Shared starter/sample scripts shipped with the game. */

export const STARTER_SCRIPT = `# FarmForge — welcome, farmer!
#
# The FieldBot listens to Python-style code.
# Give it simple commands and watch the farm change.

# Ride North onto the soil field.
move(North)

# Plant a carrot seed right here.
plant(Carrot)

# Water it until it is ready.
water()
water()
water()
water()

# Harvest the mature carrot!
harvest()
`;

export const LOOP_SAMPLE_SCRIPT = `# Automation sample
#
# You unlocked loops after harvesting 5 carrots.
# This script sweeps a row without you needing to write every step.

for i in range(6):
    if can_harvest():
        harvest()

    move(East)
`;

export const FUNCTION_SAMPLE_SCRIPT = `# Function sample
#
# def lets you pack a routine and call it anywhere.

def harvest_cell():
    if can_harvest():
        harvest()
    move(East)

harvest_cell()
harvest_cell()
harvest_cell()
`;