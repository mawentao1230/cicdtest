#include "sensor-interface.h"
#include <cmath>

bool validate_sensor_data(const SensorData& data) {
    if (data.speed_kmh < 0.0f || data.speed_kmh > 300.0f) {
        return false;
    }
    if (data.engine_rpm < 0.0f || data.engine_rpm > 10000.0f) {
        return false;
    }
    if (data.coolant_temp_c < -40.0f || data.coolant_temp_c > 150.0f) {
        return false;
    }
    if (data.fuel_level_pct > 100) {
        return false;
    }
    return true;
}

float calculate_engine_load(const SensorData& data) {
    float max_rpm = 10000.0f;
    if (data.engine_rpm <= 0.0f) {
        return 0.0f;
    }
    return (data.engine_rpm / max_rpm) * 100.0f;
}

const char* get_warning_message(float coolant_temp_c, float fuel_level_pct) {
    if (coolant_temp_c > 110.0f) {
        return "Engine Overheating!";
    }
    if (fuel_level_pct < 10.0f) {
        return "Low Fuel!";
    }
    if (coolant_temp_c > 100.0f && fuel_level_pct < 20.0f) {
        return "Check Engine!";
    }
    return "OK";
}
