using System;

//Q. What is the difference between “is” and “as” operators?
//The IS operator is USED TO CHECK the type of an object. 
//AS operator is used to PERFORM CONVERSION between compatible reference type.
namespace What_is_the_difference_between__is__and__as__operators
{
    class Program
    {
        static void Main(string[] args)
        {
            //IS Keyword
            int i = 5;
            bool check = i is int;

            Console.WriteLine(check);

            //Output: true

            //AS Keyword
            object obj = "Hello";
            string str1 = obj as string;

            Console.WriteLine(str1);
             
            //Output: Hello
        }
       
    }
}
