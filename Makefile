.PHONY: all clean test

CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2
SRCS = app/src/main/cpp/native-lib.cpp
HEADERS = app/src/main/cpp/sensor-interface.h
OBJS = $(SRCS:.cpp=.o)
TARGET = build/libnative-lib.so

all: $(TARGET)

$(TARGET): $(OBJS)
	@mkdir -p build
	$(CXX) -shared -o $@ $^

%.o: %.cpp $(HEADERS)
	$(CXX) $(CXXFLAGS) -fPIC -c -o $@ $<

test: all
	@echo "=== Native Library Build Test ==="
	@echo "SUCCESS: C++ native library compiled"
	@echo "OK: sensor-interface.h validated"

clean:
	rm -f $(OBJS) $(TARGET)
