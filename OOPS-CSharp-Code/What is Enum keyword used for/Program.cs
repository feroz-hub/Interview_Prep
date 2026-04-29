using System;

//Q. What is Enum keyword used for?
//An enum is a special "class" that represents a group of constants.

namespace What_is_Enum_keyword_used_for
{
    enum Weekdays
    {
        Sunday,
        Monday,
        Tuesday,
        Wednesday,
        Thrusday,
        Friday,
        Saturday
    }

    enum Level
    {
        Low,
        Medium,
        High
    }

    class Program
    {
        static void Main(string[] args)
        {
            Level myLevel = Level.Medium;
            
            Console.WriteLine(myLevel);
        }
    }

}
