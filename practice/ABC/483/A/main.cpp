#include <iostream>

int main() {
    int n;

    std::cin >> n;

    if (1 <= n && n <= 100) {
        if (n % 2 == 0){
            std::cout << n / 2;
        }else{
            std::cout << n / 2 + 1;
        }
    }

    return 0;
}
