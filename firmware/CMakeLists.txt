# ══════════════════════════════════════
# PART:   Pod Firmware — Build Configuration
# ACTOR:  Claude Opus 4.6
# PHASE:  18 — Zephyr RTOS + BLE GATT
# ══════════════════════════════════════

cmake_minimum_required(VERSION 3.20.0)
find_package(Zephyr REQUIRED HINTS $ENV{ZEPHYR_BASE})

project(ara_patch VERSION 1.0.0 LANGUAGES C)

target_sources(app PRIVATE
    src/main.c
    src/ble_service.c
    src/drivers/max86176.c
    src/drivers/lsm6dso.c
    src/drivers/ntc_adc.c
    src/drivers/mems_mic.c
)

target_include_directories(app PRIVATE
    src/
    src/drivers/
)
