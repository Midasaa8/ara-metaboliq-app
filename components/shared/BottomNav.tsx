import { View, TouchableOpacity } from 'react-native';

export function BottomNav() {
    return (
        <View className="absolute bottom-6 left-0 right-0 z-50 flex flex-row justify-around items-center px-4 py-3">
            <View className="bg-white/80 shadow-[0px_12px_32px_rgba(39,53,56,0.12)] rounded-full w-[90%] max-w-md flex flex-row justify-around items-center px-4 py-3">
                {/* Mockup icons */}
                <TouchableOpacity className="bg-primary rounded-full w-12 h-12 justify-center items-center">
                    {/* Usually insert SVG icon here */}
                </TouchableOpacity>
                <TouchableOpacity className="w-12 h-12 justify-center items-center">
                </TouchableOpacity>
                <TouchableOpacity className="w-12 h-12 justify-center items-center">
                </TouchableOpacity>
                <TouchableOpacity className="w-12 h-12 justify-center items-center">
                </TouchableOpacity>
            </View>
        </View>
    );
}
