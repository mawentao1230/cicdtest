#ifndef SENSOR_INTERFACE_H
#define SENSOR_INTERFACE_H

#include <cstdint>

struct SensorData {
    float speed_kmh;
    float engine_rpm;
    float coolant_temp_c;
    uint8_t fuel_level_pct;
    bool parking_brake_on;
};

bool validate_sensor_data(const SensorData& data);
float calculate_engine_load(const SensorData& data);
const char* get_warning_message(float coolant_temp_c, float fuel_level_pct);

#endif
