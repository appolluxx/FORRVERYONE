Blockly.Events.disableOrphansCustomForAtomVX = function (event) {
    if (event.type == Blockly.Events.MOVE ||
        event.type == Blockly.Events.CREATE) {
        if (!event.workspaceId) {
            return;
        }
        var workspace = Blockly.Workspace.getById(event.workspaceId);
        var block = workspace.getBlockById(event.blockId);
        if (block) {
            if (!workspace.isDragging()) {
                let block_is_valid = false;

                const valid_top_block = [ 
                    "controls_on_start", 
                    "controls_forever_asyncio_no_connect", 
                    "procedures_defnoreturn",
                    "procedures_defreturn",
                    "procedures_mutatorcontainer",
                    "procedures_mutatorarg",
                    "run_in_background_custom",
                    "switch_on_pressed",
                    "import"
                ];

                if (valid_top_block.indexOf(block.type) >= 0) {
                    block_is_valid = true;
                } else {
                    // Find parent block
                    let parent = block.getParent();
                    // console.log("first parent", block.type, parent);
                    while (parent) {
                        // console.log("loop parent", block.type, parent.type);
                        if (valid_top_block.indexOf(parent.type) >= 0) {
                            block_is_valid = true;
                            break;
                        }
                        parent = parent.getParent();
                    }
                }

                // Enable / Disable block
                block.setEnabled(block_is_valid);
                var children = block.getDescendants(false);
                for (var i = 0, child; (child = children[i]); i++) {
                    child.setEnabled(block_is_valid);
                }
            }
        }
    }
};  

addBoard({
    id: "buildbot",
    name: "Build BOT",
    description: "",
    image: "images/cover.jpg",
    tags: [
        "PT Robotics",
        "ESP32",
        "Robot"
    ],
    uploadMode: "MSC",
    mscSize: 4039680,
    chip: "ESP32S3",
    script: [ 
        "js/field_display.js",
    ],
    css: [
        "css/field_display.css",
    ],
    blocks: [
        "blocks/blocks_advanced.js",
        "blocks/blocks_io.js",
        "blocks/blocks_sensor.js",
        "blocks/blocks_motor.js",
        "blocks/blocks_servo.js",
        "blocks/blocks_display.js",
        "blocks/blocks_line_follower.js",

        "blocks/generators_avanced.js",
        "blocks/generators_io.js",
        "blocks/generators_sensor.js",
        "blocks/generators_motor.js",
        "blocks/generators_servo.js",
        "blocks/generators_display.js",
        "blocks/generators_line_follower.js",
    ],
    modules: [ ],
    firmware: [
        {
            name: "CircuitPython Build BOT",
            path: "firmware/CircuitPython.for.BuildBOT.v8.2.10-dirty.bin",
            version: "v1.24.1-dirty",
            date: "2026-04-27",
            board: "Build BOT",
            cpu: "ESP32"
        }
    ],
    usb: [
        { 
            vendorId: "303A",
            productId: "81B4"
        }
    ],
    autoCompletion: { },
    defaultCode: `
        <xml>
            <block type="controls_on_start" x="-12" y="-12">
                <next>
                    <block type="controls_forever_asyncio_no_connect"></block>
                </next>
            </block>
        </xml>
    `,
    onLoad: async (workspace, board) => {
        workspace.addChangeListener(Blockly.Events.disableOrphansCustomForAtomVX);
    },
    onDispose: async (workspace, board) => {
        workspace.removeChangeListener(Blockly.Events.disableOrphansCustomForAtomVX);
    },
    level: [
        {
            name: "Beginner",
            description: "",
            icon: "../kidbright32/images/puzzle.png",
            blocks: [
                {
                    name: "Control",
                    icon: `/images/icon/process.png`,
                    color: "#fbbd5e",
                    blocks: [
                        {
                            xml: `
                                <block type="controls_wait_asyncio">
                                    <value name="time">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        "controls_forever",
                        {
                            xml: `
                                <block type="controls_repeat_ext">
                                    <value name="TIMES">
                                        <shadow type="math_number">
                                            <field name="NUM">10</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="controls_for">
                                    <field name="VAR">i</field>
                                    <value name="FROM">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="TO">
                                        <shadow type="math_number">
                                            <field name="NUM">10</field>
                                        </shadow>
                                    </value>
                                    <value name="BY">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                          `
                        },
                        "controls_if",
                        {
                            xml: `
                                <block type="controls_if">
                                    <mutation else="1"></mutation>
                                </block>
                            `
                        },
                        "controls_wait_until",
                        "controls_whileUntil",
                        "controls_flow_statements",
                        "controls_millis"
                    ]
                },
                {
                    name: "Operators",
                    icon: `/images/icon/maths.png`,
                    color: "#293939",
                    blocks: [
                        {
                            xml: '<label text="Math"></label>',
                        },
                        {
                            xml: `
                                <block type="math_number">
                                    <field name="NUM">0</field>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_arithmetic">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">ADD</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_arithmetic">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">MINUS</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_arithmetic">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">MULTIPLY</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_arithmetic">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">DIVIDE</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_modulo">
                                    <value name="DIVIDEND">
                                        <shadow type="math_number">
                                            <field name="NUM">10</field>
                                        </shadow>
                                    </value>
                                    <value name="DIVISOR">
                                        <shadow type="math_number">
                                            <field name="NUM">2</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        "random_seed",
                        {
                            xml: `
                                <block type="math_random_int">
                                    <value name="FROM">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="TO">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_trig">
                                    <value name="NUM">
                                        <shadow type="math_number">
                                            <field name="NUM">45</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="math_round">
                                    <field name="OP">ROUND</field>
                                    <value name="NUM">
                                    <shadow type="math_number">
                                        <field name="NUM">3.1</field>
                                    </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Logic"></label>',
                        },
                        {
                            xml: `
                                <block type="logic_boolean">
                                    <field name="BOOL">TRUE</field>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="logic_compare">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">5</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">GT</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">5</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="logic_compare">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">5</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">LT</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">5</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="logic_compare">
                                    <value name="A">
                                        <shadow type="math_number">
                                            <field name="NUM">5</field>
                                        </shadow>
                                    </value>
                                    <field name="OP">EQ</field>
                                    <value name="B">
                                        <shadow type="math_number">
                                            <field name="NUM">5</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        "logic_operation",
                        "logic_negate",
                        {
                            xml: '<label text="Text"></label>',
                        },
                        "text",
                        "text_join",
                        {
                            xml: `
                                <block type="logic_compare">
                                    <field name="OP">EQ</field>
                                    <value name="B">
                                        <shadow type="text">
                                            <field name="TEXT">Hello!</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                    ]
                },
                {
                    name: "Variables",
                    icon: `/images/icon/relativity.png`,
                    color: "#ac5e2e",
                    blocks: "VARIABLE"
                },
                {
                    name: "Function",
                    icon: `/images/icon/jigsaw.png`,
                    color: "#17A589",
                    blocks: "PROCEDURE"
                },
                {
                    name: "Advanced",
                    icon: `/images/icon/expert.png`,
                    color: "#8E44AD",
                    blocks: [
                        {
                            xml: '<label text="Dashboard"></label>',
                        },
                        {
                            xml: `
                                <block type="send_into_source">
                                    <value name="value">
                                        <shadow type="math_number">
                                            <field name="NUM">33</field>
                                        </shadow>
                                    </value>
                                    <value name="source">
                                        <shadow type="text">
                                            <field name="TEXT">source1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Debug"></label>',
                        },
                        {
                            xml: `
                                <block type="print">
                                    <value name="value">
                                        <shadow type="text">
                                            <field name="TEXT">Hello, PT Robotics</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Import"></label>',
                        },
                        "import",
                        "call_import"
                    ]
                },
                {
                    name: "I/O",
                    icon: `images/connector.png`,
                    color: "#e64c3c",
                    blocks: [
                        {
                            xml: '<label text="Port"></label>',
                        },
                        {
                            xml: `
                                <block type="io_digital_write">
                                    <value name="value">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="io_analog_write">
                                    <value name="value">
                                        <shadow type="math_number">
                                            <field name="NUM">1023</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        "io_digital_read",
                        "io_analog_read",
                        {
                            xml: '<label text="Switch"></label>',
                        },
                        "switch_on_pressed",
                        "switch_get_value",
                        "switch_is_press",
                        "switch_is_release",
                        {
                            xml: '<label text="Buzzer"></label>',
                        },
                        {
                            xml: `
                                <block type="play_sound_frequency">
                                    <value name="frequency">
                                        <shadow type="math_number">
                                            <field name="NUM">1000</field>
                                        </shadow>
                                    </value>
                                    <value name="duration">
                                        <shadow type="math_number">
                                            <field name="NUM">0.1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        }
                    ]
                },
                {
                    name: "Sensor",
                    icon: `images/sensor.png`,
                    color: "#e64c3c",
                    blocks: [
                        {
                            xml: '<label text="IMU"></label>',
                        },
                        {
                            xml: `
                                <block type="imu_set_offset">
                                    <field name="angle">yaw</field>
                                    <value name="degree">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="imu_read_angle">
                                    <field name="angle">yaw</field>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Distance"></label>',
                        },
                        {
                            xml: `
                                <block type="ultrasonic_read_distance">
                                    <field name="trigger_pin">IO1</field>
                                    <field name="echo_pin">IO2</field>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="vl53L0x_read_distance">
                                    <field name="scl_pin">14</field>
                                    <field name="sda_pin">27</field>
                                </block>
                            `
                        }
                    ]
                },
                {
                    name: "Movement",
                    icon: `images/motor.png`,
                    color: "#e64c3c",
                    blocks: [
                        {
                            xml: '<label text="Basic Motor Control"></label>',
                        },
                        {
                            xml: `
                                <block type="motor_drive_single">
                                    <value name="speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_drive_all">
                                    <value name="speed1">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="speed2">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="speed3">
                                        <shadow type="math_number">
                                            <field name="NUM">-50</field>
                                        </shadow>
                                    </value>
                                    <value name="speed4">
                                        <shadow type="math_number">
                                            <field name="NUM">-50</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_move">
                                    <value name="speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_spin">
                                    <value name="speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_turn_front">
                                    <value name="speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_turn_back">
                                    <value name="speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_stop"></block>
                            `
                        },
                        {
                            xml: '<label text="Move using IMU"></label>',
                        },
                        {
                            xml: `
                                <block type="motor_set_ramp">
                                    <value name="ramp_up">
                                        <shadow type="math_number">
                                            <field name="NUM">0.1</field>
                                        </shadow>
                                    </value>
                                    <value name="ramp_down">
                                        <shadow type="math_number">
                                            <field name="NUM">0.1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_move_forward_degree">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="min_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_move_backward_degree">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="min_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_move_forward_degree_time">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="start_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">20</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                    <value name="time">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_move_backward_degree_time">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="start_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">20</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                    <value name="time">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_spin_degree">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">90</field>
                                        </shadow>
                                    </value>
                                    <value name="stop_threshold">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="min_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">12</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">0.6</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_turn_degree_front">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">90</field>
                                        </shadow>
                                    </value>
                                    <value name="stop_threshold">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="min_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">10</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">40</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="motor_turn_degree_back">
                                    <value name="angle">
                                        <shadow type="math_number">
                                            <field name="NUM">90</field>
                                        </shadow>
                                    </value>
                                    <value name="stop_threshold">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="min_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">10</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">40</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: '<label text="Servo Control"></label>',
                        },
                        {
                            xml: `
                                <block type="servo_set_degree">
                                    <value name="degree">
                                        <shadow type="math_number">
                                            <field name="NUM">90</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        }
                    ]
                },
                {
                    name: "Display",
                    icon: `images/display.png`,
                    color: "#e64c3c",
                    blocks: [
                        {
                            xml: `
                                <block type="display_draw_text">
                                    <value name="text">
                                        <shadow type="text">
                                            <field name="TEXT">Hello!</field>
                                        </shadow>
                                    </value>
                                    <value name="x">
                                        <shadow type="math_number">
                                            <field name="NUM">60</field>
                                        </shadow>
                                    </value>
                                    <value name="y">
                                        <shadow type="math_number">
                                            <field name="NUM">60</field>
                                        </shadow>
                                    </value>
                                    <value name="color">
                                        <shadow type="colour_picker">
                                            <field name="COLOUR">#FFFFFF</field>
                                        </shadow>
                                    </value>
                                    <value name="size">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="display_draw_image">
                                    <value name="x">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="y">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="display_draw_line">
                                    <value name="x1">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="y1">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="x2">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="y2">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="color">
                                        <shadow type="colour_picker">
                                            <field name="COLOUR">#FFFFFF</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="display_draw_rect">
                                    <value name="x">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="y">
                                        <shadow type="math_number">
                                            <field name="NUM">0</field>
                                        </shadow>
                                    </value>
                                    <value name="width">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="height">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="color">
                                        <shadow type="colour_picker">
                                            <field name="COLOUR">#FFFFFF</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="display_draw_circle">
                                    <value name="x">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="y">
                                        <shadow type="math_number">
                                            <field name="NUM">50</field>
                                        </shadow>
                                    </value>
                                    <value name="r">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                    <value name="color">
                                        <shadow type="colour_picker">
                                            <field name="COLOUR">#FFFFFF</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="display_fill">
                                    <value name="color">
                                        <shadow type="colour_picker">
                                            <field name="COLOUR">#FFFFFF</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="colour_picker">
                                    <field name="COLOUR">#FF0000</field>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="colour_rgb">
                                    <value name="RED">
                                    <shadow type="math_number">
                                        <field name="NUM">100</field>
                                    </shadow>
                                    </value>
                                    <value name="GREEN">
                                    <shadow type="math_number">
                                        <field name="NUM">50</field>
                                    </shadow>
                                    </value>
                                    <value name="BLUE">
                                    <shadow type="math_number">
                                        <field name="NUM">0</field>
                                    </shadow>
                                    </value>
                                </block>
                            `
                        },
                        "colour_random",
                    ]
                },
                {
                    name: "Follow Line",
                    icon: `images/line_follower.png`,
                    color: "#e64c3c",
                    blocks: [
                        {
                            xml: '<label text="Config Sensor"></label>',
                        },
                        "line_follower_calibrate",
                        "line_follower_read_line_position",
                        "line_follower_read_sensor",
                        "line_follower_read_sensor_calibrated",
                        {
                            xml: '<label text="Line Follower"></label>',
                        },
                        {
                            xml: `
                                <block type="line_follower_follow_line">
                                    <value name="base_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">70</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">0.5</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_follow_line_time">
                                    <value name="start_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">70</field>
                                        </shadow>
                                    </value>
                                    <value name="end_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">0.5</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                    <value name="time">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="stop">
                                        <shadow type="logic_boolean">
                                            <field name="BOOL">TRUE</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_follow_line_junction">
                                    <value name="start_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">70</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">0.5</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                    <value name="junction">
                                        <shadow type="line_follower_junction">
                                            <field name="junction_type">line_center</field>
                                        </shadow>
                                    </value>
                                    <value name="count">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                    <value name="stop_point">
                                        <shadow type="line_follower_stop_point">
                                            <field name="stop_point">front</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_follow_line_sensor">
                                    <value name="start_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">70</field>
                                        </shadow>
                                    </value>
                                    <value name="max_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="KP">
                                        <shadow type="math_number">
                                            <field name="NUM">0.5</field>
                                        </shadow>
                                    </value>
                                    <value name="KD">
                                        <shadow type="math_number">
                                            <field name="NUM">3</field>
                                        </shadow>
                                    </value>
                                    <value name="postion_sensor">
                                        <shadow type="line_follower_postion_sensor">
                                            <field name="position">0</field>
                                        </shadow>
                                    </value>
                                    <value name="count">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_move_check_sensor">
                                    <value name="motor_left">
                                        <shadow type="math_number">
                                            <field name="NUM">20</field>
                                        </shadow>
                                    </value>
                                    <value name="motor_right">
                                        <shadow type="math_number">
                                            <field name="NUM">20</field>
                                        </shadow>
                                    </value>
                                    <value name="postion_sensor">
                                        <shadow type="line_follower_postion_sensor">
                                            <field name="position">0</field>
                                        </shadow>
                                    </value>
                                    <value name="count">
                                        <shadow type="math_number">
                                            <field name="NUM">1</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_spin_check_sensor">
                                    <value name="direction">
                                        <shadow type="line_follower_turn_direction">
                                            <field name="direction">left</field>
                                        </shadow>
                                    </value>
                                    <value name="slow_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                    <value name="fast_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="fast_speed_time">
                                        <shadow type="math_number">
                                            <field name="NUM">0.05</field>
                                        </shadow>
                                    </value>
                                    <value name="postion_sensor">
                                        <shadow type="line_follower_postion_sensor_front">
                                            <field name="position">3</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        },
                        {
                            xml: `
                                <block type="line_follower_turn_check_sensor">
                                    <value name="direction">
                                        <shadow type="line_follower_turn_direction">
                                            <field name="direction">left</field>
                                        </shadow>
                                    </value>
                                    <value name="slow_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">30</field>
                                        </shadow>
                                    </value>
                                    <value name="fast_speed">
                                        <shadow type="math_number">
                                            <field name="NUM">100</field>
                                        </shadow>
                                    </value>
                                    <value name="fast_speed_time">
                                        <shadow type="math_number">
                                            <field name="NUM">0.1</field>
                                        </shadow>
                                    </value>
                                    <value name="postion_sensor">
                                        <shadow type="line_follower_postion_sensor_front">
                                            <field name="position">3</field>
                                        </shadow>
                                    </value>
                                </block>
                            `
                        }
                    ]
                }
            ]
        }
    ]
});
