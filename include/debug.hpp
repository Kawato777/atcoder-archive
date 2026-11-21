// dbg(...) の本体。-DLOCAL のときだけ base.cpp から読み込まれ、提出コードには入らない。
// 例: dbg(n, v, mp) -> [L12] n = 3, v = [1, 2, 3], mp = {1: 2, 3: 4}
#pragma once
#include <bits/stdc++.h>

namespace debug_detail {

template <class T>
concept Printable = requires(std::ostream& os, const T& x) { os << x; };

template <class T> void print(std::ostream& os, const T& x);

template <class T, class U> void print_pair(std::ostream& os, const std::pair<T, U>& p) {
    os << '(';
    print(os, p.first);
    os << ", ";
    print(os, p.second);
    os << ')';
}

template <class Tuple, std::size_t... I> void print_tuple(std::ostream& os, const Tuple& t, std::index_sequence<I...>) {
    os << '(';
    ((os << (I == 0 ? "" : ", "), print(os, std::get<I>(t))), ...);
    os << ')';
}

// queue / stack / priority_queue はコピーして中身を取り出す
template <class C> void print_adapter(std::ostream& os, C c) {
    os << '[';
    for (bool first = true; !c.empty(); first = false) {
        if (!first) os << ", ";
        if constexpr (requires { c.front(); }) print(os, c.front());
        else print(os, c.top());
        c.pop();
    }
    os << ']';
}

template <class T> void print(std::ostream& os, const T& x) {
    if constexpr (std::is_same_v<T, char>) {
        os << '\'' << x << '\'';
    } else if constexpr (std::is_same_v<T, std::string> || std::is_convertible_v<T, const char*>) {
        os << '"' << x << '"';
    } else if constexpr (requires { x.first; x.second; }) {
        print_pair(os, x);
    } else if constexpr (requires { std::tuple_size<T>::value; } && !requires { x.begin(); }) {
        print_tuple(os, x, std::make_index_sequence<std::tuple_size_v<T>>{});
    } else if constexpr (requires(T c) { c.pop(); }) {
        print_adapter(os, x);
    } else if constexpr (requires { x.begin(); x.end(); } && !Printable<T>) {
        constexpr bool is_map = requires { typename T::mapped_type; };
        os << (is_map ? '{' : '[');
        bool first = true;
        for (const auto& e : x) {
            if (!first) os << ", ";
            first = false;
            if constexpr (is_map) {
                print(os, e.first);
                os << ": ";
                print(os, e.second);
            } else {
                print(os, e);
            }
        }
        os << (is_map ? '}' : ']');
    } else if constexpr (std::is_same_v<T, bool>) {
        os << (x ? "true" : "false");
    } else {
        os << x;
    }
}

// "a, b, c" を名前ごとに分ける（括弧の中のカンマは区切らない）
inline std::vector<std::string> split_names(const std::string& s) {
    std::vector<std::string> names;
    std::string cur;
    int depth = 0;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') depth++;
        if (c == ')' || c == ']' || c == '}') depth--;
        if (c == ',' && depth == 0) {
            names.push_back(cur);
            cur.clear();
        } else if (!(cur.empty() && c == ' ')) {
            cur += c;
        }
    }
    names.push_back(cur);
    return names;
}

template <class... Ts> void dbg_impl(int line, const char* names, const Ts&... xs) {
    auto ns = split_names(names);
    std::size_t i = 0;
    std::cerr << "[L" << line << "] ";
    ((std::cerr << (i ? ", " : "") << ns[i] << " = ", print(std::cerr, xs), ++i), ...);
    std::cerr << std::endl;
}

}  // namespace debug_detail

#define dbg(...) debug_detail::dbg_impl(__LINE__, #__VA_ARGS__, __VA_ARGS__)
